function apiloader( path, stream, zlib, async, express, bodyParser, csv, cuid, tar, auth, queries, db, redaUtils, databus, debug ){
 
  debug = debug("routes:v0");

  var app = express(),
      API_SHARE_PATH = process.env.API_SHARE_PATH || '/tmp',
      REDA_RESULTS_PATH = process.env.REDA_RESULTS_PATH || '/tmp',
      DATABUS_INGEST = process.env.DATABUS_INGEST,
      AUTH = process.env.AUTH || false,
      APP_ROLES = { // show up in docs so set to None if no auth
        admin: process.env.ADMIN_GROUP || "None",
        user: process.env.USER_GROUP || "None"
      },
      REDA_SCHEMA = process.env.REDA_SCHEMA || 'v3g';

  debug('API_SHARE_PATH:', API_SHARE_PATH);
  debug('REDA_SCHEMA:', REDA_SCHEMA);
  debug('REDA_RESULTS_PATH:', REDA_RESULTS_PATH);
  debug('DATABUS_INGEST:', DATABUS_INGEST);
  debug('AUTH:', AUTH);

  //Route Private methods
  //authorize and apply role to a user
  var authorizeUser = function(req, res, next){

      
      debug('[authorizeUser] Calling authorize user');
      // found user to authorize 
      if( req.user ) {

        debug('[authorizeUser] Calling authorize user',req.user);
        var user = req.user,
            ldapGroups = user.memberOf instanceof Array ? user.memberOf : [user.memberOf];

        for( idx in ldapGroups) {

          // can only support ldap atm
          var ldapGroup = ldapGroups[idx].split(/,/)[0].split(/=/)[1].toLowerCase();

          for( role in APP_ROLES ){

            if( APP_ROLES[role].toLowerCase() === ldapGroup && (!req.role || req.role === 'user') ){

              debug('[authorizeUser] Found:', APP_ROLES[role] + "=" + ldapGroup );
              // overwrite if no role or user once admin stays admin
              req.role = role.toLowerCase();
            }
          }
        }

        // for logs
        req.uid = req.user.uid;

        // req has a role all good 
        if( req.role ){
          debug('[authorizeUser] role:', req.role );
          return next(null);
        }
      }
      var authErr = new Error('Not Authorized');
      authErr.status = 401;
      return next(authErr); 
  };

  // does not allow arrays of json to be processed
  var noBulk = function (req, res, next){
    if(Array.isArray(req.body)){
      var bulkError = new Error('Provided Resource does not support bulk inserts');
      bulkError.status = 400; 
      return next(bulkError);
    }
    return next(null);
  };

  //lowercase keys
  var adjustParams = function(req, res, next){

    for( key in req.params ){
      var lKey = key.toLowerCase(),
          val = req.params[key];
      delete req.params[key];
      req.params[lKey] = val;
    }
    debug( '[adjustParams] params:', req.params );
    return next(null);
  };

  //lowercase keys
  var adjustQuery = function(req, res, next){

    for( key in req.query ){
      var lKey = key.toLowerCase(),
          val = req.query[key];
      delete req.query[key];
      req.query[lKey] = val;
    }
    debug( '[adjustQuery] query:', req.query );
    return next(null);
  };

  var generateRequestId = function( req, res, next ){
    req.reqId = cuid();
    return next(null);
  };

  var getMetricData = function(runId, metricCb){

    var metricData = {
      metrics: [], // tests with metrics 
      params: {} // accociated params 
    };

    db.read('Metrics', {query:{"RunID":runId}}, function(metricErr, metrics){

      if( metricErr ){
        return metricCb(null, metricData);
      }

      async.each(metrics, function(metric, eachCb){

        metricData.metrics.push(metric);

        var metricId = metric["MetricID"];

        db.read('Params', {query:{'MetricID': metricId}},function(paramErr, params){

          if(paramErr){
            return eachCb(paramErr);
          }

          metricData.params[metricId] = params;

          return eachCb(null);
        });
      }, function(eachErr){
        debug('[getMetricData]', eachErr, 'retrieving params for metric');
        return metricCb(null, metricData);
      });
    });
  };

  var getJamaData = function(runId, jamaCb){

    var jamaData = {

      jamaReqs: [], // tests with jamas
      jamaInfo: {} // accociated jamas
    };

    db.read('JamaReqs', {query:{"RunID":runId}}, function(jamaReqsErr, jamaReqs){

      if(jamaReqsErr){
        return jamaCb(null, jamaData);
      }

      async.each(jamaReqs, function(jamaReq, eachCb){

        jamaData.jamaReqs.push(jamaReq);

        var req = jamaReq["ReqID"];

        // only need to store each jama once
        if(jamaData.jamaInfo[req]){
          return eachCb(null);
        }

        db.read('Jama', {query:{'ReqID': req}}, function(jamaErr, jamaInfo){

          if(jamaErr){
            return eachCb(jamaErr);
          }

          jamaData.jamaInfo[req] = jamaInfo[0];

          return eachCb(null);
        });
      }, function(eachErr){
        debug('[getJamaData]', eachErr, 'retrieving jamaReqs for jama info');
        return jamaCb(null, jamaData);
      });
    });
  };
 
  var getTestData = function(runId, cb){
    async.parallel({
      "runs": db.read.bind(null, 'Runs', {query:{"RunID":runId}}),
      "steps": db.read.bind(null, 'Steps', {query:{"RunID":runId}}),
      "vps": db.read.bind(null, 'VerificationPoints', {query:{"RunID":runId}}),
      "versions": db.read.bind(null, 'VersionInfo', {query:{"RunID":runId}}),
      "metrics": getMetricData.bind(null, runId),
      "jama": getJamaData.bind(null, runId)
    }, function(dbErr, testData){

      return cb(null, testData);
    });
  };

  var ingestRedaTest = function(project, runId){

    getTestData(runId, function(testErr, testData){

      if(testErr){
        debug("[DATABUS Ingest] query or db error retrieving test data for RunID:" + runId + "\n" + testErr);
        return;
      }

      // there can be lots of vps so split up the test data accordingly
      // these are done in series because runs will throw an actual error if anything is fishy and stop
      // the rest. other wise runs will ensure the pipe is open and working for the rest of its children
      // could potentially do steps ... jama in parallel on a run success....
      async.series({
        "runs": databus.ingestRuns.bind(null, 'dev', project, runId, {'runs': testData.runs}),
        "steps": databus.ingestSteps.bind(null, 'dev', project, {'runs': testData.runs, 'steps': testData.steps}),
        "vps": databus.ingestVps.bind(null, 'dev', project, {'runs': testData.runs, 'steps': testData.steps, 'vps': testData.vps}),
        "versions": databus.ingestVersions.bind(null, 'dev', project, {'runs': testData.runs, 'versions': testData.versions}),
        "metrics": databus.ingestMetrics.bind(null, 'dev', project, testData.metrics), // no data from runs...etc is ingested with metrics atm 
        "jama": databus.ingestJama.bind(null, 'dev', project, {'runs': testData.runs, 'steps': testData.steps, 'jama': testData.jama}),
      }, function(ingestErr, ingestResults){
        

        if(ingestErr){
          debug('[DATABUS ingest] ', ingestErr.message);
          return;
        }

        debug(ingestResults);

        db.update( 'Runs', {body:{"Ingested": 1}, params:{"RunID": runId}}, function(dbErr) {

          if( dbErr ){
            debug("[DATABUS Ingest] error updating ingest: " + runId + "\t\n" + dbErr);
            return;
          }
          debug("[DATABUS Ingest] ingest updated successfully: " + runId);
        });
      });
    });
  };

  app.get('/info',function(req,res){
    debug('[GET /info]', 'Sending 200');
    res.status(200).json({
      "Version": "v0",
      "Authorization": AUTH,
      "Databus Ingestion": DATABUS_INGEST 
    });
  });

  // docs do not require auth
  app.get('/',function( req, res ){
    res.redirect('../../docs');
  });

  // apply cuid to request
  app.all('*', generateRequestId );

  if( AUTH ){

    debug('APP_ROLES:', APP_ROLES);
    app.use(auth.initialize());
    app.use(auth.activeDirectoryAuth());
    app.use(authorizeUser);
  } else { // if no auth everyone is a user for now
    app.all('*', function(req, res, next) {
        req.role = 'user';
        return next(null);
    });
  }

  var allowUser = function(req, res, next ){
    if(AUTH && !req.role){
      var forbiddenErr = new Error("Forbidden to use the specified route, see Authorization docs");
      forbiddenErr.status = 403;
      return next(forbiddenErr);
    }
    return next(null);
  };

  var allowAdmin = function(req, res, next ){

    if(AUTH && !req.role){
      var forbiddenErr = new Error("Forbidden to use the specified route, see Authorization docs");
      forbiddenErr.status = 403;
      return next(forbiddenErr);
    }

    if(AUTH && req.role && req.role !== 'admin'){
      var forbiddenErr = new Error("Users are Forbidden to use the specified route, see Authorization docs");
      forbiddenErr.status = 403;
      return next(forbiddenErr);
    }

    return next(null);
  };

  //private route
  app.get('/advancedSearch', allowUser, function( req, res, next ){

    // generic table search
    function searchTable(table, query, cb){
      queries.search(table, query,  function(queryErr, queryStr){

        if(queryErr){
          return cb(queryErr);
        }

        db.read( queryStr, function(dbErr, data){

          if( dbErr ) {
            return cb(dbErr);
          }

          return cb(null, data);
        });
      });
    }

    var query;

    try {
      if(req.query.query){ // if not supplied ok use basic query
        query = JSON.parse(req.query.query);
      } else {
        var queryParseErr = new Error("No Query Provided");
        queryParseErr.status = 400;
        return next(queryParseErr);
      }
    } catch(e) {
      var queryParseErr = new Error("Could not parse provided query filter JSON");
      queryParseErr.status = 400;
      return next(queryParseErr);
    }

    if( query.distinct ){
      delete query.distinct;
    }

    if( query.select ){
      delete query.select;
    }

    if(!query.runs || !query.runs instanceof Array){
      query.runs = [];
    }
    if(!query.steps || !query.steps instanceof Array){
      query.steps = [];
    }

    queries.search('verificationpoints', query, function(queryErr, queryStr){

      if(queryErr){
        return next(queryErr);
      }

      var start = req.query.start || 0,
          count = +req.query.count || 99999999999,
          role  = req.role;

      debug('[GET /advancedSearch] role:start:count = ', role, ':', start, ':', count);

      db.read( queryStr, { start: start, count: count, role: role }, function(dbErr, vpData){

        if( dbErr ) {
          return next(dbErr);
        }

        if (!vpData || !vpData instanceof Array || vpData.length === 0){
          var emptySearchError = new Error("No tests found for the provided filter");
          emptySearchError.status = 404;
          return next(emptySearchError);
        }

        var data = {},
            len     = vpData.length,
            minVpId = vpData[0].id,
            maxVpId = vpData[len - 1].id;

        data.VerificationPoints = vpData;


        if(!query.vps || !query.vps instanceof Array){
          query.vps = [];
        }
        query.vps.push(['id', '>=', minVpId, 'AND',1]);
        query.vps.push(['id', '<=', maxVpId, 'AND',1]);

        debug('[GET /advancedSearch] retrieved ', len, ' rows starting at row: ', start );
        async.parallel({
          'steps': searchTable.bind(null, 'steps', query),
          'runs':  searchTable.bind(null, 'runs', query)
          }, function(parallelErr, results){

            if( parallelErr ) {
              return next(parallelErr);
            }

            data.Steps = results.steps;
            data.Runs = results.runs;

            debug('[GET /advancedSearch/tests]', 'Sending 200');
            res.status(200).json({ code:200, meta: { start: start, total: len }, data: data });
        });
      });
    });
  });


  app.get('/search/:resource', allowUser, function( req, res, next ){


    var query;
    try {
      if(req.query.query){ // if not supplied ok use basic query
        query = JSON.parse(req.query.query);
      }
    } catch(e) {
      var queryParseErr = new Error("Could not parse provided query filter JSON");
      queryParseErr.status = 400;
      return next(queryParseErr);
    }
     
    queries.search(req.params.resource, query,  function(queryErr, queryStr){

      if(queryErr){
        return next(queryErr);
      }

      var start = req.query.start,
          count = req.query.count,
          role  = req.role;

      debug('[get /search/:resource] role:start:count = ', role, ':', start, ':', count);

      db.read( queryStr,{ start: start, count: count, role: role }, function(dbErr, data){

        if( dbErr ) {
          return next(dbErr);
        }

        debug('[GET /search/:resource] retrieved ', data.length, ' rows starting at row: ', start );
        debug('[GET /search/:resource]', 'Sending 200');
        res.status(200).json({ code:200, meta: { start: start, total: data.length}, data:data });
      });
    });
  });

  app.post('/run', allowUser, bodyParser.json(), noBulk, function(req,res,next){

      db.create( 'Runs', req, function(dbErr, data) {

        if( dbErr ) {
          return next(dbErr);
        }

        res.insertId = data.insertId;
        debug('[POST /run] id:', data.insertId, ' Sending 200');
        res.status( 200 ).json({ code: 200, data: data });
      });
  });

  app.post('/run/:RunID', allowUser, bodyParser.json(), noBulk, function(req,res,next){

    db.update( 'Runs', req, function(dbErr, data) {

      if( dbErr ){
        return next(dbErr);
      }

      if( DATABUS_INGEST &&
          req.body.Status &&
          req.body.Status.toLowerCase() === "complete" ) {
        ingestRedaTest(REDA_SCHEMA, req.params.RunID);
      }

      debug('[POST /run/:RunID]', 'Sending 200');
      res.status( 200 ).json({ code: 200, data: data });
    });
  });

  app.get('/runs', allowUser, function( req, res, next ){

    db.read( 'Runs', req, function(dbErr, data, meta){

      if( dbErr ) {
        return next(dbErr);
      }

      debug('[GET /runs]', 'Sending 200');
      res.status(200).json({ code:200, data:data, meta:meta });
    });
  });

  app.post('/runPlan', allowUser, bodyParser.json(), noBulk, function(req,res,next){

    db.create( 'RunPlans', req, function(dbErr, data) {

      if( dbErr ){
        return next(dbErr);
      }

      // store for logs
      res.insertId = data.insertId;
      debug('[POST /runPlan]', 'Sending 200');
      res.status( 200 ).json({ code: 200, data: data });
    });
  });

  app.post('/runPlan/:PlanId', allowUser, bodyParser.json(), noBulk, function(req,res,next){
    

    db.update( "RunPlans", req, function(dbErr, data) {

      if( dbErr ){
        return next(dbErr);
      }

      debug('[POST /runPlan/:planId]', 'Sending 200');
      res.status( 200 ).json({ code: 200, data: data });
    });
  });

  app.get('/runPlans', allowUser, function( req, res, next ){

    db.read( 'RunPlans', req, function(dbErr, data, meta){

      if( dbErr ) {
        return next(dbErr);
      }

      debug('[GET /runPlans]', 'Sending 200');
      res.status(200).json({ code: 200, data: data, meta: meta });
    });
  });

  app.delete('/runPlan/:PlanId', allowAdmin, function( req, res, next ){

    db.delete('RunPlans', req, function(dbErr, data){
      if(dbErr){
        return next(dbErr);
      }
      debug('[DELETE /RunPlans]', 'Sending 200');
      res.status(200).json({ code:200, data:data});
    });
  });

  app.post('/stepPlan', allowUser, bodyParser.json(), noBulk, function(req,res,next){


    db.create( 'StepPlans', req, function(dbErr, data) {

      if( dbErr ){
        return next(dbErr);
      }

      // store for logs
      res.insertId = data.insertId;

      debug('[POST /stepPlan]', 'Sending 200');
      res.status( 200 ).json({ code: 200, data: data });
    });
  });

  app.post('/stepPlan/:PlanId', allowUser, bodyParser.json(), noBulk, function(req,res,next){
    
    db.update( 'StepPlans', req, function(dbErr, data) {

      if( dbErr ){
        return next(dbErr);
      }

      debug('[POST /stepPlan/:planId]', 'Sending 200');
      res.status( 200 ).json({ code: 200, data: data });
    });
  });

  app.get('/stepPlans', allowUser, function( req, res, next ){

    db.read( 'StepPlans', req, function(dbErr, data, meta){

      if( dbErr ) {
        return next(dbErr);
      }

      debug('[GET /stepPlans]', 'Sending 200');
      res.status(200).json({ code:200, data:data, meta: meta });
    });
  });

  app.delete('/stepPlan/:PlanId', allowAdmin, function( req, res, next ){

    db.delete('StepPlans', req, function(dbErr, data){
      if(dbErr){
        return next(dbErr);
      }
      debug('[DELETE /stepPlans]', 'Sending 200');
      res.status(200).json({ code:200, data:data});
    });
  });

  app.post('/runPlanLink', allowUser, bodyParser.json(), noBulk, function(req,res,next){


    db.create( 'RunPlanLinks', req, function(dbErr, data) {

      if( dbErr ){
        return next(dbErr);
      }

      // store for logs
      res.insertId = data.insertId;

      debug('[POST /runPlanLink]', 'Sending 200');
      res.status( 200 ).json({ code: 200, data: data });
    });
  });

  app.post('/runPlanLink/:LinkId', allowUser, bodyParser.json(), noBulk, function(req,res,next){

    db.create( 'RunPlanLinks', req, function(dbErr, data) {

      if( dbErr ){
        return next(dbErr);
      }

      // store for logs
      res.insertId = data.insertId;

      debug('[POST /runPlanLink/:linkId]', 'Sending 200');
      res.status( 200 ).json({ code: 200, data: data });
    });
  });

  app.get('/runPlanLinks', allowUser, function( req, res, next ){

    db.read( 'RunPlanLinks', req, function(dbErr, data, meta){

      if( dbErr ) {
        return next(dbErr);
      }

      debug('[GET /runPlanLinks]', 'Sending 200');
      res.status(200).json({ code:200, data:data, meta: meta });
    });
  });

  app.delete('/runPlanLinks', allowAdmin, function( req, res, next ){

    db.delete('RunPlanLinks', req, function(dbErr, data){
      if(dbErr){
        return next(dbErr);
      }
      debug('[DELETE /RunPlanLinks]', 'Sending 200');
      res.status(200).json({ code:200, data:data});
    });
  });

  app.post('/stepPlanLink', allowUser, bodyParser.json(), noBulk, function(req,res,next){

    db.create( 'StepPlanLink', req, function(dbErr, data) {

      if( dbErr ){
        return next(dbErr);
      }

      // store for logs
      res.insertId = data.insertId;

      debug('[POST /stepPlanLink]', 'Sending 200');
      res.status( 200 ).json({ code: 200, data: data });
    });
  });

  app.post('/stepPlanLink/:LinkId', allowUser, bodyParser.json(), noBulk, function(req,res,next){

    db.create( 'StepPlanLinks', req, function(dbErr, data) {

      if( dbErr ){
        return next(dbErr);
      }

      // store for logs
      res.insertId = data.insertId;

      debug('[POST /stepPlanLink/:linkId]', 'Sending 200');
      res.status( 200 ).json({ code: 200, data: data });
    });
  });

  app.get('/stepPlanLinks', allowUser, function( req, res, next ){

    db.read( 'StepPlanLinks', req, function(dbErr, data, meta){

      if( dbErr ) {
        return next(dbErr);
      }

      debug('[GET /stepPlanLinks]', 'Sending 200');
      res.status(200).json({ code:200, data:data, meta: meta });
    });
  });

  app.delete('/stepPlanLinks', allowAdmin, function( req, res, next ){

    db.delete('StepPlanLinks', req, function(dbErr, data){
      if(dbErr){
        return next(dbErr);
      }
      debug('[DELETE /StepPlanLinks]', 'Sending 200');
      res.status(200).json({ code:200, data:data});
    });
  });

  app.post('/run/:RunID/step', allowUser, bodyParser.json(), noBulk, function(req,res,next){

    db.exists( 'Runs', req, function(existsErr, exists) {

      if(existsErr){
        return next(existsErr);
      }

      if( !exists ){
        var runErr = new Error('Could not find the specified Run, for the provided Step');
        runErr.status = 404;
        return next(runErr);
      }
      

      db.create( 'Steps', req, function(dbErr, data){

        if( dbErr ) {
          return next(dbErr);
        }

        // store for logs
        res.insertId = data.insertId;
        debug('[POST /run/:runId/step]', 'Sending 200');
        res.status( 200 ).json({ code: 200, data: data });
      });
    });
  });

  app.post('/run/:RunID/step/:StepID', allowUser, bodyParser.json(), noBulk, function(req,res,next){
    
    db.update( 'Steps', req, function(dbErr, data) {

      if( dbErr ){
        return next(dbErr);
      }

      // store for logs
      res.insertId = data.insertId;
      debug('[POST /run/:runId/step/:stepId]', 'Sending 200');
      res.status( 200 ).json({ code: 200, data: data });
    });
  });

  app.get('/steps', allowUser, function( req, res, next ){

    db.read( 'Steps', req, function(dbErr, data, meta){

      if( dbErr ) {
        return next(dbErr);
      }

      // store for logs
      res.insertId = data.insertId;

      debug('[GET /steps]', 'Sending 200');
      res.status(200).json({ code:200, data:data, meta: meta });
    });
  });

  app.post('/run/:RunID/verificationPoint', allowUser, bodyParser.json(), noBulk, function(req,res,next){ 
    db.exists( 'Runs', req, function(existsErr, exists) {

      if(existsErr){
        return next(existsErr);
      }

      if( !exists ){
        var runErr = new Error('Could not find the specified Run, for the provided VerificationPoint');
        runErr.status = 404;
        return next(runErr);
      }
      
      debug('[POST /run/:RunId/verificationPoint] run exists');

      db.create('VerificationPoints', req, function(dbErr, data){

        if(dbErr){
          return next(dbErr);
        }

        // store for logs
        res.insertId = data.insertId;

        debug('[POST /run/:RunId/verificationPoint]', 'Sending 200');
        res.status( 200 ).json({ code: 200, data: data });
      });
    });
  });

  app.post('/run/:RunID/step/:StepID/verificationPoint', allowUser, bodyParser.json(), noBulk, function(req,res,next){ 
    db.exists( 'Steps', req, function(existsErr, exists) {

      if(existsErr){
        return next(existsErr);
      }

      if( !exists ){
        var stepErr = new Error('Could not find the specified Step, for the provided VerificationPoint');
        stepErr.status = 404;
        return next(stepErr);
      }

      debug('[POST /run/:RunId/step/:StepId/verificationPoint] step exists');

      db.create('VerificationPoints', req, function(dbErr, data){

        if(dbErr){
          return next(dbErr);
        }

        // store for logs
        res.insertId = data.insertId;

        debug('[POST /run/:RunId/step/:StepId/verificationPoint]', 'Sending 200');
        res.status( 200 ).json({ code: 200, data: data });
      });
    });
  });

  app.get('/verificationPoints', allowUser, function( req, res, next ){

    //build query
    db.read( 'VerificationPoints', req, function(dbErr, data, meta){

      if( dbErr ) {
        return next(dbErr);
      }

      debug('[GET /verificationPoints]', 'Sending 200');
      res.status(200).json({ code:200, data:data, meta: meta });
    });
  });

  app.post('/run/:RunID/versionInfo', allowUser, bodyParser.json(), noBulk, function(req,res,next){

    db.exists( 'Runs', req, function(existsErr, exists) {

      if(existsErr){
        return next(existsErr);
      }

      if( !exists ){
        var runErr = new Error('Could not find the specified Run, for the provided VersionInfo');
        runErr.status = 404;
        return next(runErr);
      }
      

      debug('[POST /run/:runId/versionInfo] run exists');

      db.create('VersionInfo', req, function(dbErr,data){

        if(dbErr){
          return next(dbErr);
        }

        // store for logs
        res.insertId = data.insertId;

        debug('[POST /run/:runId/versionInfo]', 'Sending 200');
        res.status( 200 ).json({ code: 200, data: data });
      });
    });
  });

  app.get('/versionInfo', allowUser, function( req, res, next ){

    db.read( 'VersionInfo', req, function(dbErr, data, meta){

      if( dbErr ) {
        return next(dbErr);
      }

      debug('[GET /versionInfo]', 'Sending 200');
      res.status(200).json({ code:200, data:data, meta: meta });
    });
  });

  app.post('/run/:RunID/jamaReqs', allowUser, function(req,res,next){

    db.exists( 'Runs', req, function(existsErr, exists) {

      if(existsErr){
        return next(existsErr);
      }

      if( !exists ){
        var runErr = new Error('Could not find the specified Run, for the provided Jama Requirment. Ensure it has been created');
        runErr.status = 404;
        return next(runErr);
      }

      debug('[POST /run/:RunID/jamaReqs] Run');

      db.create('JamaReqs', req, function(dbErr, data){

        if(dbErr){
          return next(dbErr);
        }

        // store for logs
        //res.insertId = data.insertId;

        debug('[POST /run/:RunID/jamaReqs]',data.insertId,'Sending 200');
        res.status( 200 ).json({ code: 200, data: data });
      });
    });
  });

  app.post('/run/:RunID/jamaReq/:ReqID', allowUser, function(req,res,next){

    req.body = {"ReqID": req.params.ReqID};
    delete req.params.ReqID;

    db.exists( 'Runs', req, function(existsErr, exists) {

      if(existsErr){
        return next(existsErr);
      }

      if( !exists ){
        var stepErr = new Error('Could not find the specified Run/Step, for the provided Jama Requirment. Ensure it has been created');
        stepErr.status = 404;
        return next(stepErr);
      }

      debug('[POST /run/:RunID/jamaReq/:ReqID] Run/Step exists');

      db.create('JamaReqs', req, function(dbErr, data){

        if(dbErr){
          return next(dbErr);
        }

        // store for logs
        //res.insertId = data.insertId;

        debug('[POST /run/:RunID/jamaReq/:ReqID]',data.insertId,'Sending 200');
        res.status( 200 ).json({ code: 200, data: data });
      });
    });
  });

  app.post('/run/:RunID/step/:StepID/jamaReqs', allowUser, function(req,res,next){

    db.exists( 'Steps', req, function(existsErr, exists) {

      if(existsErr){
        return next(existsErr);
      }

      if( !exists ){
        var stepErr = new Error('Could not find the specified Run/Step, for the provided Jama Requirment. Ensure it has been created');
        stepErr.status = 404;
        return next(stepErr);
      }

      debug('[POST /run/:RunID/step/:StepID/jamaReqs] Run/Step exists');

      db.create('JamaReqs', req, function(dbErr, data){

        if(dbErr){
          return next(dbErr);
        }

        // store for logs
        // res.insertId = data.insertId;

        debug('[POST /run/:RunID/jamaReqs]',data.insertId,'Sending 200');
        res.status( 200 ).json({ code: 200, data: data });
      });
    });
  });

  app.post('/run/:RunID/step/:StepID/jamaReq/:ReqID', allowUser, function(req,res,next){

    req.body = {"ReqID": req.params.ReqID};
    delete req.params.ReqID;

    db.exists( 'Steps', req, function(existsErr, exists) {

      if(existsErr){
        return next(existsErr);
      }

      if( !exists ){
        var stepErr = new Error('Could not find the specified Run/Step, for the provided Jama Requirment. Ensure it has been created');
        stepErr.status = 404;
        return next(stepErr);
      }

      debug('[POST /run/:RunID/step/:StepID/jamaReq/:ReqID] Run/Step exists');

      db.create('JamaReqs', req, function(dbErr, data){

        if(dbErr){
          return next(dbErr);
        }

        // store for logs
        //res.insertId = data.insertId;

        debug('[POST /run/:RunID/step/:StepID/jamaReq/:ReqID]',data.insertId,'Sending 200');
        res.status( 200 ).json({ code: 200, data: data });
      });
    });
  });

  /*app.get('/jamaReqs', allowUser, function( req, res, next ){

    //build query 
    db.read('JamaReqs', req, function(dbErr, data, meta){

      if( dbErr ) {
        return next(dbErr);
      }

      debug('[GET /jamaReqs]', 'Sending 200');
      res.status(200).json({ code:200, data:data, meta: meta });
    });
  });*/

  app.post('/run/:RunID/step/:StepID/attributes', allowUser, bodyParser.json(), function(req,res,next){

    db.exists( 'Steps', req, function(existsErr, exists) {

      if(existsErr){
        return next(existsErr);
      }

      if( !exists ){
        var stepErr = new Error('Could not find the specified Step, for the provided Attribute');
        stepErr.status = 404;
        return next(stepErr);
      }

      var result = { "code": 200,
                     "data": {"fieldCount":0,"affectedRows":0,"insertId":0,"serverStatus":2,"warningCount":0,"message":"","protocol41":true,"changedRows":0}
                   };
      
      var body = req.body instanceof Array ? req.body : [req.body];

      async.eachOf(body, function(attribute, idx, eachCb){

        req.body = attribute;

        db.create('Attributes', req,  function(dbErr,data){

          if(dbErr){
            if( dbErr.code !== "ER_DUP_ENTRY" ){
              return eachCb(dbErr);
            }
          }

          // store for logs
          res.insertId = data.insertId;
          ++result.data.affectedRows;

          return eachCb(null);
        });
      }, function(insertErr){

        if(insertErr){
          return next(insertErr);
        }

        debug('[POST /run/:runId/step/:stepId/attributes]', 'Sending 200');
        res.status( 200 ).json({ code: 200, data: result });
      });
    });
  });

  app.get('/attributes', allowUser, function( req, res, next ){

    db.read( 'Attributes', req, function(dbErr, data){

      if( dbErr ) {
        return next(dbErr);
      }

      debug('[GET /attributes]', 'Sending 200');
      res.status(200).json({ code:200, data:data });
    });
  });

  app.get('/results/:RunID/info', allowUser, function( req, res){

     debug('[GET /results/:RunID/info]', 'Sending 200');
     res.status(200).json({"hey" : "Results Info","ID":req.params.RunID}); 
  
  });

  app.get('/results/:RunID/readFile', allowUser, adjustParams, adjustQuery, function( req, res, next ){

    if( !req.query.srcpath ){
      var err = new Error('SrcPath query parameter is required to retrieve a file');
      err.status = 400;
      return next(err);
    }

    debug('[GET /results/:runId/readFile] srcpath:', req.query.srcpath);

    var fullResultPath = path.resolve(path.join(REDA_RESULTS_PATH,req.params.runid)),
        fullResultPathRegexp = new RegExp("^" + fullResultPath + "/.+");
    debug('[GET /results/:runId/readFile] fullResultPath:', fullResultPath);
    debug('[GET /results/:runId/readFile] fullResultPathRegexp:', fullResultPathRegexp);

    var fullSrcPath = path.resolve(path.join(fullResultPath,req.query.srcpath));
    debug('[GET /results/:runId/readFile] fullSrcPath:', fullSrcPath);

    if( !fullResultPathRegexp.test( fullSrcPath ) ){
      var err = new Error('SrcPath resolved at or outside of provided result directory');
      err.status = 400;
      return next(err);
    }

    var readStream = redaUtils.getFileReadStream(fullSrcPath);
    readStream.on('error',function(readStreamErr){
      if( !req.errMsg ) {
        req.errMsg ='fs : ' + (readStreamErr.code || 'NO CODE') + ' : ' + (readStreamErr.message || 'NO MESSAGE');
        debug("[GET /results/:runId/readFile]" + req.errMsg);
        return next(redaUtils.getError(readStreamErr));
      }
    });

    res.on('error', function(resErr){
      debug('[GET /results/:runId/readFile] res event: error ', resErr.code || 'NO CODE', resErr.message || 'NO MESSAGE' );
      if( !req.errMsg ) {
        req.errMsg = 'res : ' + (resErr.code || 'NO CODE') + ' : ' + (resErr.message || 'NO MESSAGE');
        resErr.status = 400;
        return next(resErr); // this may be passed to defualt error handler
      }
    })
    .on('finish', function(){
      if( !req.errMsg ){
        debug('[GET /results/:runId/readFile] res event: finish', 'Sending 200');
        res.end(); // on pipe 200 status is sent at start of pipe
      }
    })
    .on('close', function(){
      // if client exits this will fire and not finish... so don't send resp
      debug('[GET /results/:runId/readFile] res event: close ');
      readStream.close();
    });

    res.attachment( path.basename( fullSrcPath ) );
    readStream.pipe(res);
  });

  app.post('/results/:runId/saveFile', allowUser, adjustParams, adjustQuery, function( req, res, next ){

    if( !req.query.filename ){
      var err = new Error('Could not find output filepath in query');
      err.status = 400;
      return next(err);
    }

    debug('[POST /results/:runId/saveFile] filepath:', req.query.filename);
    var fileFullPath =  path.normalize( REDA_RESULTS_PATH + '/' + req.params.runid + '/uploads/' + req.query.filename );
    debug('[POST /results/:runId/saveFile] fileFullPath:', fileFullPath);

    //create a write stream
    var writeStream = redaUtils.getFileWriteStream( fileFullPath ),
        gunzip = zlib.createGunzip();

    writeStream.on('error', function(writeStreamErr){

      debug('[POST /results/:runId/saveFile] writeStream event error');

      if( !req.errMsg ){
        req.errMsg ='fs : ' + (writeStreamErr.code || 'NO CODE') + ' : ' + (writeStreamErr.message || 'NO MESSAGE');
        // delegate to redaUtils for sys errors until streams can be refactored 
        next(redaUtils.getError(writeStreamErr));
      }
      this.end();
    })
    .on('close', function(){
      debug('[POST /results/:runId/saveFile] writeStream event: close');
      if( !req.errMsg ){
        debug('[POST /results/:runId/saveFile] Sending 200');
        res.status(200).send({code: 200, data:'File written successfully'});
      }
    });

    gunzip.on('error', function(unzipErr){

      debug('[POST /results/:runId/saveFile] unzip event: error');
      if( !req.errMsg ){
        req.errMsg ='unzip : ' + (unzipErr.code || 'NO CODE') + ' : ' + (unzipErr.message || 'NO MESSAGE');
        // delegate to redaUtils for sys errors until streams can be refactored 
        next(redaUtils.getError(unzipErr));
      }
      this.end(); // end this first incase it tries to do a final write into the writeStream.
      writeStream.end(); // this will close the write stream and trigger it's close event if it was opened
    });

    req.on('error', function(reqErr){
      debug('[POST /results/:runId/saveFile] req event error : ' + (reqErr.code || 'NO CODE') + ' : ' + (reqErr.message || 'NO MESSAGE'));
    });

    //check for gzip
    if( req.get('Content-Encoding') === 'gzip' ){ // required header

      debug('[POST /results/:runId/saveFile] extracting and uploading');
      req.pipe(gunzip).pipe(writeStream);
    } else {

      debug('[POST /results/:runId/saveFile] uploading without extracting');
      req.pipe(writeStream);
    }
  });

  app.post('/results/:runID', allowUser, function( req, res, next ){

    var runid = req.params.runID;

    if( isNaN(runid) ){
      var idErr = new Error('RunId must be a number corresponding to a test run');
      idErr.status = 400;
      return next(idErr);
    }

    debug('[POST /results/:runID] runid:', runid );
    req.insertId = runid; //for logs

    var skipped = false;
    // traxting tars since day one...
    var tartraxtor = tar.extract({
      cwd: REDA_RESULTS_PATH,
      onwarn: function(message, data){
        debug('[POST /results:RunID] onwarn: message:', message || 'NO MESSAGE');
        debug('[POST /results:RunID] onwarn: path:', data.path || 'NO PATH DATA');
        skipped = true;
      },
      filter: function(filePath){
        var runComp = filePath.split(/\//g)[0];
        if( !isNaN(runComp) && runComp === runid ){
          return true;
        }
        debug('[POST /results:RunID] skip run filter: path:', filePath || 'NO PATH DATA');
        skipped = true;
        return false;
      },
      //strict: true,
      keep: true, // does not overwrite existing files
      dmode: 0755,
      fmode: 0644,
      preserveOwner: false // ab reda nfs export configs set this user this will have to be configured for the proper conater user once nfs is removed
    })
    /*.on('error', function(extractErr){ //requires tar to set strict=true other wise just warns atm
      
      debug('[POST /results/:runID] tar event: error', runid, extractErr.code || 'NO CODE', extractErr.message || 'NO MESSAGE' ); // place holder for now
      if( !req.errMsg ){
        req.errMsg = 'tar.x : ' + (extractErr.code || 'NO CODE') + ' : ' + (extractErr.message || 'NO MESSAGE');
        return next(redaUtils.getError(extractErr));
      }
    })*/
    .on('close',function(){

      debug('[POST /results/:RunID] tar event close');

      if(skipped){
        debug('[POST /results/:RunID] tar event close: Sending 400');
        var skippedErr = new Error('Archive for ' + runid + ' failed/partially uploaded to ReDa, check your local archive for errors');
        skippedErr.status = 400;
        return next(skippedErr);
      }

      debug('[POST /results/:RunID] tar event close: Sending 200');
      res.status(200).json({ code: 200, data: 'Successfully Uploaded Results ' + runid + ' to ReDa' });
    });

    req.on('error', function( reqErr ){
      debug('[POST /results/:RunID] req event: error', reqErr.code || 'NO CODE', reqErr.message || 'NO MESSAGE' ); // place holder for now
    });

    redaUtils.stat(path.normalize( REDA_RESULTS_PATH + '/' + runid ), function(statErr, exists){

      if( statErr ){
        return next(statErr);
      }

      if( exists ){
        debug('[POST /results] Error Archive Already Exists' ); // place holder for now
        var dirErr = new Error('Archive already exists!');
        dirErr.status = 400;
        return next(dirErr);
      }

      req.pipe(tartraxtor);
    });
  });

  app.get('/results/:runID', allowUser, function( req, res, next ){

    var runid = req.params.runID,
        srcpath = req.query.SrcPath || "";

    debug('[GET /results/:runId] runid:', runid);
    debug('[GET /results/:runId] srcpath:', srcpath);

    var fullResultPath = path.resolve(path.join(REDA_RESULTS_PATH, runid)),
        fullResultPathRegexp = new RegExp("^" + fullResultPath );
    debug('[GET /results/:runId] fullResultPath:', fullResultPath);
    debug('[GET /results/:runId] fullResultPathRegexp:', fullResultPathRegexp);

    var fullSrcPath = path.resolve(path.join(fullResultPath, srcpath));
    debug('[GET /results/:runId] fullSrcPath:', fullSrcPath);

    if( !fullResultPathRegexp.test( fullSrcPath ) ){
      var err = new Error('SrcPath resolved at or outside of provided result directory');
      err.status = 400;
      return next(err);
    }

    var srcBaseName = path.basename(fullSrcPath);
    var outPath = srcpath === "" ? runid : runid + "-" + srcBaseName;

    debug('[GET /results/:runId] outPath:', outPath);


    var tarchiver = tar.create({
      cwd: REDA_RESULTS_PATH,
      /*onwarn: function(message, data){
        debug('[GET /results/:runArchive] onwarn message:', message);
        debug('[GET /results/:runArchive] onwarn data:', data);
        req.errMsg.push(message);
      },*/
      gzip: true,
      strict: true
    },[path.join(runid,srcpath)]) // archive this run i.e. runid is a dir in the cwd:REDA_RESULTS_PATH
    .on('error', function(createErr){ //requires tar to set strict=true otherwise just warns thorough onwarn function atm
      if( !req.errMsg ) {
        debug('[GET /results/:runId] tar event: error ', createErr.code || 'NO CODE', createErr.message || 'NO MESSAGE' );
        req.errMsg = 'tar.c : ' + (createErr.code || 'NO CODE') + ' : ' + (createErr.message || 'NO MESSAGE'); // will be overwritten in error handler
        next(redaUtils.getError(createErr));
      }
    });
   
    res.on('error', function(resErr){
      debug('[POST /results/:runId] res event: error ', resErr.code || 'NO CODE', resErr.message || 'NO MESSAGE' );
      if( !req.errMsg ) {
        req.errMsg = 'res : ' + (resErr.code || 'NO CODE') + ' : ' + (resErr.message || 'NO MESSAGE');
        resErr.status = 400;
        return next(resErr); // this may be passed to defualt error handler
      }
    })
    .on('finish', function(){
      if( !req.errMsg ){
        debug('[GET /results/:runId] res event: finish', 'Sending 200');
        res.end(); // on pipe 200 status is sent at start of pipe
      }
    })
    .on('close', function(){
      // if client exits this will fire and not finish... so don't send resp
      debug('[POST /results/:runId] res event: close ');
      tarchiver.end();
    });

    res.attachment(outPath + ".tar.gz");
    tarchiver.pipe(res);
  });

  app.get('/results/:runId/list', allowUser, adjustParams, function( req, res, next ){

    var runid = req.params.runid;

    if( isNaN(runid) ){
      var runErr = new Error('Run Archives should be of the form <RunId>.tgz or <RunId>.tar.gz');
      runErr.status = 400;
      return next(runErr);
    }

    debug('[GET /results/:runId/list] runid:', runid);
    req.insertId = runid; // for logs

    redaUtils.readDirectoryRec(path.normalize( REDA_RESULTS_PATH + '/' + runid ), function( readErr, files){

      if(readErr){
        return next(readErr);
      }

      debug('[GET /results/:runId/list] directory read successfully','Sending 200');
      res.status(200).json({code: 200, data: files.map(function(filePath){
        return filePath.replace(REDA_RESULTS_PATH + "/", ""); //do not return internal path components should be able to change these if necessary!!!
      })});
    });
  });

  app.post('/run/:RunID/metric', allowUser, bodyParser.json(), noBulk, function(req,res,next){

    db.exists( 'Runs', req, function(existsErr, exists) {

      if(existsErr){
        return next(existsErr);
      }

      if( !exists ){
        var runErr = new Error('Could not find the specified Run, for the provided Metric. Ensure it has been created');
        runErr.status = 404;
        return next(runErr);
      }

      debug('[POST /run/:RunID/metric] Run exists');
      var Params = req.body.Params;
      delete req.body.Params;
      debug(req.body);
      db.create( 'Metrics', req, function(metricErr, metricData) {

        if( metricErr ){
          return next(metricErr);
        }

        // store for logs
        res.insertId = metricData.insertId;

        if(Params){
          db.create('Params', {body:Params, params:{'MetricID':metricData.insertId}}, function(paramErr) {

            if(paramErr){
              return next(paramErr);
            }

            debug('[POST /run/:RunID/metric]', 'Sending 200');
            res.status( 200 ).json({ code: 200, data: metricData });
          });

        } else {

          debug('[POST /run/:RunID/metric]', 'Sending 200');
          res.status( 200 ).json({ code: 200, data: metricData });
        }
      });
    });
  });

  app.post('/run/:RunID/step/:StepID/metric', allowUser, bodyParser.json(), noBulk, function(req,res,next){

    db.exists( 'Steps', req, function(existsErr, exists) {

      if(existsErr){
        return next(existsErr);
      }

      if( !exists ){
        var stepErr = new Error('Could not find the specified Step, for the provided Metric. Ensure it has been created');
        stepErr.status = 404;
        return next(stepErr);
      }

      debug('[POST /run/:RunID/step/:StepID/metric] Step exists');

      var Params = req.body.Params;
      delete req.body.Params;

      db.create( 'Metrics', req, function(metricErr, metricData) {

        if( metricErr ){
          return next(metricErr);
        }

        // store for logs
        res.insertId = metricData.insertId;
        if( Params ){

          db.create('Params', {body: Params, params:{"MetricID": metricData.insertId}}, function(paramErr) {

            if(paramErr){
              return next(paramErr);
            }

            debug('[POST /run/:RunID/step/:StepID/metric]', 'Sending 200');
            res.status( 200 ).json({ code: 200, data: metricData });
          });

        } else {

          debug('[POST /run/:RunID/step/:StepID/metric]', 'Sending 200');
          res.status( 200 ).json({ code: 200, data: metricData });
        }
      });
    });
  });

  app.post('/metric/:MetricID/params', allowUser, bodyParser.json(), function(req,res,next) {

    db.create( 'Params', req, function(dbErr, data) {

      if( dbErr ){
        return next(dbErr);
      }

      // store for logs
      res.insertId = data.insertId;

      debug('[POST /metric/:MetricID/params]', 'Sending 200');
      res.status( 200 ).json({ code: 200, data: data });
    });
  });

  return app;
}

module.exports = apiloader;
