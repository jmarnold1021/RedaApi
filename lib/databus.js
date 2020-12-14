module.exports = function( path, async, _, fs, jwtDecode, util, request, debug ){

    debug = debug('lib:DATABUS');

    // ENV
        DATABUS_USERNAME           = process.env.DATABUS_USERNAME          || "sea_svc_idb_user",
        DATABUS_PASSWORD           = process.env.DATABUS_PASSWORD;

    //GLOBAL
    // RETRY VARIABLES SEE
    // https://caolan.github.io/async/v3/docs.html#retry 
    // mainly for underlying token reqs
    var DATABUS_RETRY_TIMES = 4,
        DATABUS_RETRY_INTERVAL = function(retryCount){
          return 1000 * Math.pow(2, retryCount);
        };

    // res obj stuff that may be reused
    var DATABUS_CACHE = {
        "dev": {
          "token": null,
          "exp": null,
          "streams": {}
        },
        "preprod": {
          "token": null,
          "exp": null,
          "streams": {}
        }
    };

    // request objs per service mainly for convinience
    var databusIngestRequest = request.defaults({
      baseUrl: process.env.DATABUS_INGEST_URL
    });

    var databusTokenRequest = request.defaults({
      method: 'GET',
      baseUrl: DATABUS_JWT_BASE_URL,
      auth: {
        username: DATABUS_USERNAME,
        password: DATABUS_PASSWORD 
      },
      rejectUnauthorized: false
    });

    var databusStreamRequest = request.defaults({
       method: 'GET',
       rejectUnauthorized: false
    });

    var databusPostRequest = request.defaults({
      method: 'POST',
      json: true, 
      rejectUnauthorized: false
    });

    // PRIVATE 
    var databusError = function(service, statusCode, body){

      body = body || {};
      var code = body.code || statusCode || 501,
          message = body.message || body || 'Received unknown response from service';

      return new Error(util.format("DATABUS ERROR: service: %s, code: %d, message: %s", service, code, message));
    };

    var getToken = function(env){
      return DATABUS_CACHE[env].token;
    };

    var setToken = function(env, token){
      DATABUS_CACHE[env].token = token;
    };

    var getTokenExp = function(env){
      return DATABUS_CACHE[env].exp;
    };

    var setTokenExp = function(env, exp){
      DATABUS_CACHE[env].exp = exp;
    };

    var getStreamId = function(env, name){
      return DATABUS_CACHE[env].streams[name];
    };

    var setStreamId = function(env, name, id){
      DATABUS_CACHE[env].streams[name] = id;
    };

    var renewToken = function(env, renewCb){

      // renew 10 mins before exp
      // Depending on env renewToken will re-use until 10 mins
      // if for somereson tokens expire in less than 10 mins(currently 1hr atm)
      // this will renew everytime and should be adjusted
      var renew = _.now() + 600000, // get prempted bruh
          oldToken = getToken(env),
          exp = getTokenExp(env);

      if( oldToken && exp ) {
        if( exp > renew ){
          debug('[renewToken] Reusing Token renew: ' + renew + ', exp: ' + exp);
          return renewCb(null); // ok
        }
      }

      var options = {
        uri: util.format("/token?stripe=idb&name=streams-%s", env)
      };
      
      databusTokenRequest(options, function(renewErr, res, token){

        if(renewErr){
          renewErr.status = 500;
          return renewCb( databusError('token', 500, renewErr) );
        }

        if(res.statusCode !== 200){
          return renewCb( databusError('token', res.statusCode, token) );
        }

        try {
          var jwtToken = jwtDecode(token);
          exp = jwtToken.exp * 1000;
          setToken(env, token);
          setTokenExp(env, exp); // so's we don't have to parse each time to check
          debug('[renewToken] New Token renew: ' + renew + ', exp: ' + exp);
          return renewCb(null);
        } catch(e){
          return renewCb( databusError('token', 500, 'Could not parse provided jwt token ' + token) );
        }
      });
    };

    var checkStreamId = function(env, streamName, tags, streamCb){

      renewToken(env, function(renewErr){

        if(renewErr){
          return streamCb(renewErr);
        }

        var streamId = getStreamId(env, streamName);
        if( !_.isUndefined(streamId) && !_.isNull(streamId) ){
          debug('[checkStreamId] Reusing stream: name:', streamName, ', id:', streamId);
          return streamCb(null);
        }

        var options = {
            baseUrl: util.format(DATABUS_BASE_URL_TEMPLATE, env),
            uri: util.format("/streams?name=%s&tags=%s", streamName, tags),
            auth : {
              'bearer': getToken(env)
            }
        };

        databusStreamRequest(options, function(streamErr, res, streamInfo){

          if(streamErr){
            return streamCb(databusError('stream', 500, streamErr));
          }

          if(res.statusCode !== 200){
            return streamCb(databusError('stream', res.statusCode, streamInfo));
          }

          try{
            streamId = JSON.parse(streamInfo)[0].id;
            setStreamId(env, streamName, streamId);
            debug('[checkStreamId] New stream: name:', streamName, ', id:', streamId);
            return streamCb(null);
          } catch(e){
            return streamCb(databusError('stream', 500, 'Could not parse stream response json ' + streamInfo));
          }
        });
      });
    };

    var postDatabusMessages = function(env, streamName, messages, postCb){

      renewToken(env, function(renewErr){

        if(renewErr){
          renewErr.status = 500;
          return postCb(renewErr);
        }

        var options = {
          baseUrl: util.format(DATABUS_BASE_URL_TEMPLATE, env),
          uri: util.format("/rest/%s/messages", getStreamId(env, streamName) ),
          auth : {
            'bearer': getToken(env) 
          },
          body: messages
        };

        databusPostRequest(options, function(postErr, res, body){

          if(postErr){
            return postCb(databusError('rest', res.statusCode, postErr));
          }

          if(res.statusCode !== 200){
            return postCb(databusError('rest', res.statusCode, body));
          }

          return postCb(null);
        });
      });
    };

    var ingestData = function(env, streamName, tags, dbData, ingestCb){
       
        // https://caolan.github.io/async/v3/docs.html#retry 
        // mainly for underlying token reqs
        async.series([
          async.retryable({
            times: DATABUS_RETRY_TIMES,
            interval: DATABUS_RETRY_INTERVAL 
          }, checkStreamId.bind(null, env, streamName, tags)),
          async.retryable({
            times: DATABUS_RETRY_TIMES,
            interval: DATABUS_RETRY_INTERVAL 
          }, postDatabusMessages.bind(null, env, streamName, dbData))
        ], function(ingestErr){
           
           if(ingestErr){
             return ingestCb(ingestErr);
           }

           return ingestCb(null);
        });
    };

    var convertApiValues = function(apiObj){

      var convertedApiObj = {};

      _.each(apiObj, function(val, key){
        switch(key){
 
          // can probs combine float and int sections
          case 'ResultValueInt': //ints -> keep or 0
            convertedApiObj[key] = _.isNumber(val) || !_.isNaN(+val) ? +val : 0;
            break;

          case 'Value':
          case 'ResultValueFloat':
          case 'DurationHrs': //floats -> keep or 0.00
            convertedApiObj[key] = _.isNumber(val) || !_.isNaN(+val) ? +val : 0.00;
            break;

          case 'CreateDate':
          case 'ModDate':
          case 'Datetime': //Dates -> MS or defualt(determined by es time field)
          case 'CleanupDatetime':
            convertedApiObj[key] = _.isDate(val) ?  new Date(val).getTime() : 981163425000;
            break;

          default: //Strings/Objs keep or "null" valued string
            convertedApiObj[key] = _.isUndefined(val) ||
                                   _.isNull(val) ||
                                   _.isString(val) && _.isEmpty(val) ? "null" : val;
            break;
        };
      });

      return convertedApiObj;
    };

    var convertRun = function(apiRun){

      var dbRun = {};

      // not every avro key maps to the same api key
      dbRun['time']        = apiRun['Datetime'];
      dbRun['cleanuptime'] = apiRun['CleanupDatetime'];
      dbRun['id']          = apiRun['RunID'];
      dbRun['duration']    = apiRun['DurationHrs'];
      dbRun['station']     = apiRun['StationName'];
      dbRun['groupname']   = apiRun['RunName'];
      dbRun['testcase']    = apiRun['TestCase'];
      dbRun['user']        = apiRun['User'];
      dbRun['status']      = apiRun['Status'];
      dbRun['description'] = apiRun['Description'];
      dbRun['result']      = apiRun['Result'];
      dbRun['runmode']     = apiRun['SAMRunMode']; //sometimes
      dbRun['testplan']    = apiRun['TestPlan'];   //sometimes
      dbRun['testcycle']   = apiRun['SAMRunMode']; //sometimes

      return dbRun;
    };

    var convertStep = function(apiStep){

      var dbStep = {};

      // not every avro key maps to the same api key
      dbStep['time']     = apiStep['Datetime'];
      dbStep['id']       = apiStep['StepID'];
      dbStep['duration'] = apiStep['DurationHrs'];
      dbStep['name']     = apiStep['ScriptName'];
      dbStep['testcase'] = apiStep['TestCase'];
      dbStep['status']   = apiStep['Status'];
      dbStep['param']    = apiStep['ConfigFile'];
      dbStep['result']   = apiStep['Result'];

      return dbStep;
    };

    var convertVp = function(apiVp){

      var dbVp = {};

      // not every avro key maps to the same api key
      dbVp['id']             = apiVp['StepID'];
      dbVp['time']           = apiVp['Datetime']; // taken from run.Datetime
      dbVp['name']           = apiVp['Name'];
      dbVp['op']             = apiVp['Operator'];
      dbVp['vp_type']        = apiVp['Type']; // 'Type' has special usage for all records(see the ingest methods) so local defs need new key
      dbVp['result']         = apiVp['Result'];
      dbVp['expvalue']       = apiVp['ExpectedValue'];
      dbVp['actvalue']       = apiVp['ResultValue'];
      dbVp['actvalue_int']   = apiVp['ResultValueInt'];   //brand new
      dbVp['actvalue_float'] = apiVp['ResultValueFloat']; //brand new

      return dbVp;
    };

    var convertVersion = function(apiVersion){

      var dbVersion = {};

      // not every avro key maps to the same api key
      dbVersion['id']           = apiVersion['RunID'];
      dbVersion['time']         = apiVersion['Datetime']; // taken from run.Datetime
      dbVersion['name']         = apiVersion['Name'];
      dbVersion['version_type'] = apiVersion['Type']; // 'Type' has special usage for all records(see the ingest methods) so local defs need new key
      dbVersion['version']      = apiVersion['Version'];

      return dbVersion;
    };

    var convertJama = function(apiJama){

      var dbJama = {};

      // not every avro key maps to the same api key
      dbJama['time']         = apiJama['Datetime']; // taken from run.Datetime
      dbJama['req_id']       = apiJama['ReqID']; 
      dbJama['description']  = apiJama['Description'];
      dbJama['create_date']  = apiJama['CreateDate']; 
      dbJama['mod_date']     = apiJama['ModDate']; 
      dbJama['tier']         = apiJama['Tier'];
      dbJama['jama_type']    = apiJama['Type']; // 'Type' has special usage for all records(see the ingest methods) so local defs need new key
      dbJama['parent']       = apiJama['Parent'];
      dbJama['id']           = apiJama['id'];

      return dbJama;
    };

    var convertMetric = function(apiMetric){

      dbMetric = {};

      dbMetric['metric'] = apiMetric['Metric'];
      dbMetric['timestamp'] = { "long" : apiMetric['Datetime'] };
      dbMetric['value'] = { "double" : apiMetric['Value'] };

      return dbMetric;
    };

    var convertParams = function(apiMetric, apiParams){

      var dbParams = {
            'run_id': String(apiMetric['RunID']),
            'step_id': String(apiMetric['StepID']),
            'metric_id': String(apiMetric['MetricID']),
            'metric_type': String(apiMetric['Type'])
          };

      _.each(apiParams, function(apiParam){
        var param = {};
        
        param[apiParam['Name']] = _.isNull(apiParam['Value']) || _.isUndefined(apiParam['Value']) ? "null" : String(apiParam['Value']);
        _.extend(dbParams, param);
      });

      return dbParams;
    };

    // public
    return {

      ingestRuns: function(env, project, runId, testData, runCb){

        // what the api or pre run setup should provide somehow from the avro
        // or setup databus requests etc...
        var streamName = util.format('reda.%s.runs', project),
            tags = 'env,testing';

        var dbData = {
          'messages': []
        };

        if(_.isEmpty(testData.runs[0])){
          return runCb(databusError('ingest', 500, 'no run data found for provided RunID:' + runId));
        }

        if(testData.runs[0]['Ingested']){
          return runCb(databusError('ingest', 500, 'test has already been ingested RunID:' + runId));
        }

        _.each(testData.runs[0], function(apiRun){

          var dbRun = {
            'type': 'run'
          };

          // may exsit or not depending on proj but avro requires
          // explicitly sets them to null instead of undefined
          apiRun['SAMRunMode'] = apiRun['SAMRunMode'];
          apiRun['TestPlan']   = apiRun['TestPlan'];
          apiRun['TestCycle']  = apiRun['TestCycle'];
          apiRun = convertApiValues(apiRun);

          dbRun = _.extend(dbRun, convertRun(apiRun));

          dbData.messages.push({key: "",value: dbRun});
        });

        ingestData(env, streamName, tags, dbData, function(ingestErr){

          if(ingestErr){
            return runCb(ingestErr);// run returns an actual error nothing should happen if run does not ingest
          }

          return runCb(null, 'success RunID:' + runId);
        });
      },

      ingestSteps: function(env, project, testData, stepCb){

        var streamName = util.format('reda.%s.steps', project),
            tags = 'env,testing';

        var dbData = {
          'messages': []
        };

        if(_.isEmpty(testData.steps[0])){
          return stepCb(null, 'No Data');
        }

        _.each(testData.steps[0], function(apiStep){

          var dbStep = {
            'type': 'step',
            'run': {'string': 'null' }
          };

          _.each(testData.runs[0], function(apiRun){
            apiRun = convertApiValues(apiRun);
            dbStep['run'] = { 'reda.run': convertRun(apiRun) };
          });

          apiStep = convertApiValues(apiStep);
          dbStep = _.extend(dbStep, convertStep(apiStep));

          dbData.messages.push({key: "", value: dbStep});
        });

        ingestData(env, streamName, tags, dbData, function(ingestErr){
          if(ingestErr){
            return stepCb(null, ingestErr.message);
          }
          return stepCb(null, 'success');
        });
      },

      ingestVps: function(env, project, testData, vpCb){

        var streamName = util.format('reda.%s.vps', project),
            tags = 'env,testing';

        var dbData = {
          'messages': []
        };

        if(_.isEmpty(testData.vps[0])){
          return vpCb(null, 'No Data');
        }

        _.each(testData.vps[0], function(apiVp){

          var dbVp = {
            'type': 'vp',
            'run': {'string': 'null' },
            'step': {'string': 'null' }
          };

          // there can only be one!
          apiVp['ResultValueInt'] = apiVp['Type'] === 'int' ?  apiVp['ResultValue'] : null;
          apiVp['ResultValueFloat'] = apiVp['Type'] === 'float' ?  apiVp['ResultValue'] : null;

          _.each(testData.runs[0], function(apiRun){

            // api to api addition -> gets converted later properly
            apiVp['Datetime'] = apiRun['Datetime'];
            apiRun = convertApiValues(apiRun);
            dbVp['run'] = { 'reda.run': convertRun(apiRun) };
          });

          _.each(testData.steps[0], function(apiStep){

            if(apiVp['StepID'] === apiStep['StepID']){ 
              apiStep = convertApiValues(apiStep);
              dbVp['step'] = { 'reda.step': convertStep(apiStep) };
            }
          });

          apiVp = convertApiValues(apiVp);
          dbVp = _.extend(dbVp, convertVp(apiVp));
          dbData.messages.push({key: "", value: dbVp});
        });

        ingestData(env, streamName, tags, dbData, function(ingestErr){
          if(ingestErr){
            return vpCb(null, ingestErr.message);
          }
          return vpCb(null, 'success');
        });
      },

      ingestVersions: function(env, project, testData, versionCb){

        var streamName = util.format('reda.%s.versions', project),
            tags = 'env,testing';

        var dbData = {
          'messages': []
        };

        if(_.isEmpty(testData.versions[0])){
          return versionCb(null, 'No Data');
        }

        _.each(testData.versions[0], function(apiVersion){

          var dbVersion = {
            'type': 'version',
            'run': {'string': 'null' }
          };

          _.each(testData.runs[0], function(apiRun){

            // api to api addition -> gets converted later properly
            apiVersion['Datetime'] = apiRun['Datetime'];
            apiRun = convertApiValues(apiRun);
            dbVersion['run'] = { 'reda.run': convertRun(apiRun) };
          });

          apiVersion = convertApiValues(apiVersion);
          dbVersion = _.extend(dbVersion, convertVersion(apiVersion));
          dbData.messages.push({key: "", value: dbVersion});
        });

        ingestData(env, streamName, tags, dbData, function(ingestErr){
          if(ingestErr){
            return versionCb(null, ingestErr.message);
          }
          return versionCb(null, 'success');
        });
      },

      ingestMetrics: function(env, project, metricData, metricCb){

        var streamName = util.format('reda.%s.metrics', project),
            tags = 'env,testing';

        var dbData = {
          'messages': []
        };

        if(_.isEmpty(metricData.metrics)){
          return metricCb(null, 'No Data');
        }

        var params = metricData.params;
 
        _.each(metricData.metrics, function(apiMetric){

          var dbMetric = {
            'tags': {
              'map': {}
            },
            metadata: null
          };

          var apiParams = params[apiMetric['MetricID']];
          dbMetric['tags']['map'] = _.extend(dbMetric['tags']['map'], convertParams(apiMetric, apiParams));

          apiMetric = convertApiValues(apiMetric);
          dbMetric = _.extend(dbMetric, convertMetric(apiMetric));
          dbData.messages.push({key: "", value: dbMetric});
        });
        
        ingestData(env, streamName, tags, dbData, function(ingestErr){
          if(ingestErr){
            return metricCb(null, ingestErr.message);
          }
          return metricCb(null, 'success');
        });
      },

      ingestJama: function(env, project, testData, jamaCb){

        var streamName = util.format('reda.%s.jama', project),
            tags = 'env,testing';

        var dbData = {
          'messages': []
        };

        if(_.isEmpty(testData.jama.jamaReqs)){
          return jamaCb(null, 'No Data');
        }

        var jamaInfo = testData.jama.jamaInfo;

        _.each(testData.jama.jamaReqs, function(apiJama){

          var dbJama = {
            'type': 'jama',
            'run': {'string': 'null' },
            'step': {'string': 'null' }
          };

          var apiJama = _.extend(apiJama, jamaInfo[apiJama['ReqID']]);

          _.each(testData.runs[0], function(apiRun){

            // api to api addition -> gets converted later properly
            apiJama['Datetime'] = apiRun['Datetime'];
            apiRun = convertApiValues(apiRun);
            dbJama['run'] = { 'reda.run': convertRun(apiRun) };
          });

          _.each(testData.steps[0], function(apiStep){

            if(apiJama['StepID'] !== 0 && 
               apiJama['StepID'] === apiStep['StepID']){
               apiStep = convertApiValues(apiStep);
               dbJama['step'] = { 'reda.step': convertStep(apiStep) };
            }
          });

          apiJama = convertApiValues(apiJama);
          dbJama = _.extend(dbJama, convertJama(apiJama));
          dbData.messages.push({key: "", value: dbJama});
        });

        ingestData(env, streamName, tags, dbData, function(ingestErr){
          if(ingestErr){
            return jamaCb(null, ingestErr.message);
          }
          return jamaCb(null, 'success');
        });
      },

      // legacy way
      redaIngest: function( project, runId, testData, cb){

        var options = {
          url: 'reda/' + project + '/' + runId,
          method: 'POST',
          body: testData,
          json: true
        };

        databusIngestRequest(options, function(reqErr, res, body){
         
          if(reqErr){
            return cb(databusError(reqErr));
          }
          if(res.statusCode !== 200){
            return cb(new Error(body.message));
          }
          return cb(null,body);
        });
      }
    };
};
