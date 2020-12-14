module.exports = function( _, dateformat, debug ){

  debug = debug('lib:QUERIES'); 

  var DATE_FORMAT = 'yyyy-mm-dd HH:MM:ss',
      DATE_FORMAT_UTC = 'UTC:yyyy-mm-dd HH:MM:ss';

  //translate query errors
  function queryErr(ERR_CODE){

      var err = new Error('Error constructing query, check query, body, or path args');
      err.status = 400;

      switch(ERR_CODE){
        case "ER_BAD_FIELD_ERROR":
          err.message = 'Error constructing query, missing required field in query, body, or path args, see docs for query requirements.';
          err.status = 400;
          return err;

        //this is a problem because you can acidentally reserve a pkey that does not 
        // belong to you
        case "ER_PRIMARY_KEY_FOUND_IN_SET":
          err.message = 'Error performing query, found primary key in set clause. These are auto-generated values.';
          err.status = 400;
          return err;
        default: 
          return err;
      };
  }

  // makes user input easier to check for 
  // schema requirements and converts keys
  function processKeys( ogKeys, table, values ){
  
      // weird case where we don't need table specific conversions
      // but do need values. so see if a swap is necessary
      if( table && !values && _.isArray(table) ){
        values = table;
        table = null; 
      }

      var finalKeys  = {},
          keyConversions = _.extend({ // global conversions will never break stuff so everyone can has

          "runid" : "grpid",
          "stepid" : "testid",
          "configfile" : "samparamfile",
          "runname" : "groupname",
          "testexecserver" : "samstation"

        },{

          // resource specific conversions may break stuff if used with improper table 
          "GroupInfo" : {
              "result" : "specpassfail"
          },
          "TestInfo" : {
              "result" : "specpassfail",
          }
        }[table]);

      //1. ogKeys is not an array so just return 
      //2. should we combine real specified values or blank ones in the case of batch insert queries
      ogKeys = _.isArray( ogKeys ) ? _.object( ogKeys, _.isArray( values ) ? values : new Array(ogKeys.length) ) : ogKeys || {};

      //if there are duplicate lowercased keys
      // the last found is used
      _.mapObject(ogKeys, function( val, key ){

        var lKey = key.toLowerCase();
        finalKeys[ keyConversions[lKey] || lKey ] = val;

        return val; // arbitrary
      });

      // things that should never be there
      delete finalKeys[''];

      debug('[processKeys] Table:', table || 'UNSPECIFIED');
      debug('[processKeys] finalKeys:', finalKeys );
      return finalKeys;
  }

  //sql `entity` processing  tables are case sensitive
  function tick(token, table){

    //entitys(bulk instert stuff) should never have ...
    // these also can't make use of lowerCaseKeys above
    token = token.trim().replace(/(\n)+/g,'');
  
    token = '`' + token.toLowerCase() + '`';

    return table ? '`' + table + '`.' + token : token;
  }

  //'value' processing
  function quote(token){

    //empty string vals
    if( token === '' ){
        return "''";
    }
    //strings
    if(isNaN(token) && token !== 'NULL' ){

        var functionRegExp = new RegExp(/^DATE_SUB\(NOW\(\),INTERVAL\s\d*\s\w*\)$/);
        if(functionRegExp.test(token)){
          return token;
        }
        // saw this bug while watching the logs
        // sql groups by ' and quotes with " so if a string has single quotes replace with "
        token = token.replace(/"/g,"'");
        return '"' + token + '"';
    }

    //Numbers
    return token;
  }

  function buildSelect(attrs, distinct, table){

      if(!attrs || _.isEmpty(attrs)){
        return 'SELECT *';
      }

      attrs = _.isArray(attrs) ? attrs : [attrs];

      return _.reduce(attrs, function(accSelectStr, attr, idx){
          if(idx === 0 && distinct){
              accSelectStr += 'DISTINCT ';
          }
          kv = processKeys([attr],table,[""]);
          accSelectStr += tick(_.keys(kv)[0]);
          if( idx !== attrs.length - 1 ){
             accSelectStr += ",";
          }
          return accSelectStr; 

      },'SELECT ',{});
  }

  function buildSearchFilter(tableFilters, table) {

      tableFilters = tableFilters && _.isArray(tableFilters)  ? tableFilters  : [];

      return _.reduce( tableFilters, function(accWhereStr, filter, idx){

                   if( _.isArray(filter) && filter.length >= 4 ){

                       var kv = processKeys([filter[0]],table,[filter[2]]),
                           key = _.keys(kv)[0],
                           op  = filter[1],
                           val = kv[key],
                           logic = filter[3],
                           clause = tick(key) + ' ' + op + ' ' + quote(val);


                       if( filter.length === 4 ) {

                           accWhereStr += clause;
                           if( idx !== tableFilters.length - 1 ){
                               return accWhereStr += ' ' + logic + ' ';
                           } else if( idx === tableFilters.length - 1 && this.grouping ){
                               this.grouping = false;
                               return accWhereStr += ')';
                           }

                           return accWhereStr;
                       }
                       else if( filter.length === 5 && !this.grouping ) {

                           accWhereStr += '(' + clause;
                           if( idx !== tableFilters.length - 1 ){
                               this.grouping = true;
                               return accWhereStr += ' ' + logic + ' ';
                           }

                           return accWhereStr += ')';

                       } else if( filter.length === 5 && this.grouping ){

                           accWhereStr += clause;
                           this.grouping = false;
                           if( idx !== tableFilters.length - 1 ){
                               return accWhereStr += ') ' + logic + ' ';
                           }

                           return accWhereStr += ')';

                       }
                   }

                   return accWhereStr;

           },'', {grouping: false});
  };
  return {

           /**
            * Currnetly supports tables GroupInfo, TestInfo, VerificationPoints, VersionInfo
            **/
           search : function( table, query, cb ){

             if( typeof query === 'function' ){
               cb = query;
               query = null;
             }

             /**
              *  query = {
              *      vps : [['name','=','val','or'],['name','=','val','and'],['name','=','val','logic'],...],
              *      runs: [['attr','op','val','logic'],['attr','op','val','logic'],...],
              *      steps: [['attr','op','val','logic'],['attr','op','val','logic'],...],
              *      vers: [['attr','op','val','logic'],['attr','op','val','logic'],...],
              *      rps: [['attr','op','val','logic'],['attr','op','val','logic'],...],
              *      sps: [['attr','op','val','logic'],['attr','op','val','logic'],...],
              *      rpl: [['attr','op','val','logic'],['attr','op','val','logic'],...],
              *      spl: [['attr','op','val','logic'],['attr','op','val','logic'],...],
              *  }
              **/
              var filters = query || {};

              debug('[search] table', table);
              debug('[search] filters', filters);

              // apply Id filter to not blow away paging.

              if(filters.datewindow){
                var datewindowVal =  filters.datewindow.val || 1,
                    datewindowUnit = filters.datewindow.unit || "DAY";

                datewindowUnit = _.contains(["HOUR","DAY","WEEK","MONTH","YEAR"], filters.datewindow.unit.toUpperCase())
                                            ? filters.datewindow.unit.toUpperCase()
                                            : "DAY";

                query.runs = [['Datetime','>=','DATE_SUB(NOW(),INTERVAL ' + datewindowVal + ' ' +  datewindowUnit + ')','AND']].concat(query.runs);
                query.steps = [['Datetime','>=','DATE_SUB(NOW(),INTERVAL ' + datewindowVal + ' ' +  datewindowUnit + ')','AND']].concat(query.steps);
              }

              var searchSelect = buildSelect(),
                  runFilter  = buildSearchFilter(filters.runs,'GroupInfo'),
                  stepFilter = buildSearchFilter(filters.steps,'TestInfo'),
                  vpFilter   = buildSearchFilter(filters.vps),
                  verFilter  = buildSearchFilter(filters.vers),
                  rpsFilter  = buildSearchFilter(filters.rps),
                  spsFilter  = buildSearchFilter(filters.sps),
                  rplFilter  = buildSearchFilter(filters.rpl),
                  splFilter  = buildSearchFilter(filters.spl),
                  order      = filters.order || "ASC";

              order = _.contains(["ASC","DESC"], order.toUpperCase())
                                 ? order.toUpperCase()
                                 : "ASC";
             

              // build provided filters
              switch(table.toLowerCase().trim()){
                case "runs":

                  var attrs = filters.select || filters.distinct || [],
                      attrSelect;

                  if( !_.isEmpty(attrs) ){
                      attrSelect = buildSelect(attrs, filters.distinct, 'GroupInfo');
                  }

                  var finalQuery = searchSelect + ' FROM `GroupInfo`';

                  if(!_.isEmpty(runFilter)){
                      finalQuery += " WHERE ( " + runFilter + " )";
                  }

                  // this just works I think cray huh...
                  if(!_.isEmpty(stepFilter) &&
                     _.isEmpty(runFilter)){
                      finalQuery += " WHERE `grpid` IN ( SELECT `grpid` FROM `TestInfo` WHERE " + stepFilter + " )";
                  } else if(!_.isEmpty(stepFilter)){
                      finalQuery += " AND `grpid` IN ( SELECT `grpid` FROM `TestInfo` WHERE " + stepFilter + " )";
                  }

                  if(!_.isEmpty(vpFilter) &&
                     _.isEmpty(runFilter) &&
                     _.isEmpty(stepFilter)){
                      finalQuery += " WHERE `grpid` IN ( SELECT `grpid` FROM `VerificationPoints` WHERE " + vpFilter + " )";
                  } else if(!_.isEmpty(vpFilter)){
                      finalQuery += " AND `grpid` IN ( SELECT `grpid` FROM `VerificationPoints` WHERE " + vpFilter + " )";
                  }

                  if(!_.isEmpty(verFilter) &&
                     _.isEmpty(runFilter) &&
                     _.isEmpty(stepFilter) &&
                     _.isEmpty(vpFilter)){
                      finalQuery += " WHERE `grpid` IN ( SELECT `grpid` FROM `VersionInfo` WHERE " + verFilter + " )";
                  } else if( !_.isEmpty(verFilter) ) {
                      finalQuery += " AND `grpid` IN ( SELECT `grpid` FROM `VersionInfo` WHERE " + verFilter + " )";
                  }

                  finalQuery += " ORDER BY `grpid` " + order;

                  if(!_.isEmpty(attrSelect)){
                    finalQuery = attrSelect + " FROM (" + finalQuery + ") AS T";
                  }

                  debug('[search] finalQuery', finalQuery);
                  return cb(null, finalQuery);

                case "steps":

                  var attrs = filters.select || filters.distinct || [],
                      attrSelect;

                  if( !_.isEmpty(attrs) ){
                      attrSelect = buildSelect(attrs, filters.distinct, 'TestInfo');
                  }

                  var finalQuery = searchSelect + ' FROM `TestInfo`';

                  if(!_.isEmpty(stepFilter)){
                      finalQuery += " WHERE ( " + stepFilter + " )";
                  }

                  if(!_.isEmpty(runFilter) &&
                     _.isEmpty(stepFilter)){
                      finalQuery += " WHERE `grpid` IN ( SELECT `grpid` FROM `GroupInfo` WHERE " + runFilter + " )";
                  } else if(!_.isEmpty(runFilter)){
                      finalQuery += " AND `grpid` IN ( SELECT `grpid` FROM `GroupInfo` WHERE " + runFilter + " )";
                  }

                  if(!_.isEmpty(vpFilter) &&
                     _.isEmpty(runFilter) &&
                     _.isEmpty(stepFilter)){
                      finalQuery += " WHERE (`grpid`,`testid`) IN ( SELECT `grpid`,`testid` FROM `VerificationPoints` WHERE " + vpFilter + " )";
                  } else if(!_.isEmpty(vpFilter)){
                      finalQuery += " AND (`grpid`,`testid`) IN ( SELECT `grpid`,`testid` FROM `VerificationPoints` WHERE " + vpFilter + " )";
                  }

                  if(!_.isEmpty(verFilter) &&
                     _.isEmpty(runFilter) &&
                     _.isEmpty(stepFilter) &&
                     _.isEmpty(vpFilter)){
                      finalQuery += " WHERE `grpid` IN ( SELECT `grpid` FROM `VersionInfo` WHERE " + verFilter + " )";
                  } else if( !_.isEmpty(verFilter) ) {
                      finalQuery += " AND `grpid` IN ( SELECT `grpid` FROM `VersionInfo` WHERE " + verFilter + " )";
                  }

                  finalQuery += " ORDER BY `grpid`,`testid` " + order;

                  if(!_.isEmpty(attrSelect)){
                    finalQuery = attrSelect + " FROM (" + finalQuery + ") AS T";
                  }

                  debug('[search] finalQuery', finalQuery);
                  return cb(null, finalQuery);

                case "verificationpoints":

                  var attrs = filters.select || filters.distinct || [],
                      attrSelect;

                  if( !_.isEmpty(attrs) ){
                      attrSelect = buildSelect(attrs, filters.distinct);
                  }

                  var finalQuery = searchSelect + ' FROM `VerificationPoints`';

                  if(!_.isEmpty(vpFilter)){
                      finalQuery += " WHERE ( " + vpFilter + " )";
                  }

                  if(!_.isEmpty(runFilter) &&
                     _.isEmpty(vpFilter)){
                      finalQuery += " WHERE `grpid` IN ( SELECT `grpid` FROM `GroupInfo` WHERE " + runFilter + " )";
                  } else if(!_.isEmpty(runFilter)){
                      finalQuery += " AND `grpid` IN ( SELECT `grpid` FROM `GroupInfo` WHERE " + runFilter + " )";
                  }

                  if(!_.isEmpty(stepFilter) &&
                     _.isEmpty(runFilter) &&
                     _.isEmpty(vpFilter)){
                      finalQuery += " WHERE (`grpid`,`testid`) IN ( SELECT `grpid`,`testid` FROM `TestInfo` WHERE " + stepFilter + " )";
                  } else if(!_.isEmpty(stepFilter)){
                      finalQuery += " AND (`grpid`,`testid`) IN ( SELECT `grpid`,`testid` FROM `TestInfo` WHERE " + stepFilter + " )";
                  }

                  if(!_.isEmpty(verFilter) &&
                     _.isEmpty(runFilter) &&
                     _.isEmpty(stepFilter) &&
                     _.isEmpty(vpFilter)){
                      finalQuery += " WHERE `grpid` IN ( SELECT `grpid` FROM `VersionInfo` WHERE " + verFilter + " )";
                  } else if( !_.isEmpty(verFilter) ) {
                      finalQuery += " AND `grpid` IN ( SELECT `grpid` FROM `VersionInfo` WHERE " + verFilter + " )";
                  }

                  finalQuery += " ORDER BY `id` " + order;

                  if(!_.isEmpty(attrSelect)){
                    finalQuery = attrSelect + " FROM (" + finalQuery + ") AS T";
                  }

                  debug('[search] finalQuery', finalQuery);
                  return cb(null, finalQuery);

                case "versioninfo":

                  var attrs = filters.select || filters.distinct || [],
                      attrSelect;

                  if( !_.isEmpty(attrs) ){
                      attrSelect = buildSelect(attrs, filters.distinct);
                  }

                  var finalQuery = searchSelect + ' FROM `VersionInfo`';

                  if(!_.isEmpty(verFilter)){
                      finalQuery += " WHERE ( " + verFilter + " )";
                  }

                  if(!_.isEmpty(stepFilter) &&
                     _.isEmpty(verFilter)){
                      finalQuery += " WHERE `grpid` IN ( SELECT `grpid` FROM `TestInfo` WHERE " + stepFilter + " )";
                  } else if(!_.isEmpty(stepFilter)){
                      finalQuery += " AND `grpid` IN ( SELECT `grpid` FROM `TestInfo` WHERE " + stepFilter + " )";
                  }

                  if(!_.isEmpty(vpFilter) &&
                     _.isEmpty(verFilter) &&
                     _.isEmpty(stepFilter)){
                      finalQuery += " WHERE `grpid` IN ( SELECT `grpid` FROM `VerificationPoints` WHERE " + vpFilter + " )";
                  } else if(!_.isEmpty(vpFilter)){
                      finalQuery += " AND `grpid` IN ( SELECT `grpid` FROM `VerificationPoints` WHERE " + vpFilter + " )";
                  }

                  if(!_.isEmpty(runFilter) &&
                     _.isEmpty(verFilter) &&
                     _.isEmpty(stepFilter) &&
                     _.isEmpty(vpFilter)){
                      finalQuery += " WHERE `grpid` IN ( SELECT `grpid` FROM `GroupInfo` WHERE " + runFilter + " )";
                  } else if( !_.isEmpty(runFilter) ) {
                      finalQuery += " AND `grpid` IN ( SELECT `grpid` FROM `GroupInfo` WHERE " + runFilter + " )";
                  }

                  finalQuery += " ORDER BY `grpid`,`name`,`type` " + order;

                  if(!_.isEmpty(attrSelect)){
                    finalQuery = attrSelect + " FROM (" + finalQuery + ") AS T";
                  }

                  debug('[search] finalQuery', finalQuery);
                  return cb(null, finalQuery);

                case "runplans":

                  var attrs = filters.select || filters.distinct || [],
                      attrSelect;

                  if( !_.isEmpty(attrs) ){
                      attrSelect = buildSelect(attrs, filters.distinct);
                  }

                  var finalQuery = searchSelect + ' FROM `RunPlans`';

                  if(!_.isEmpty(rpsFilter)){
                      finalQuery += " WHERE ( " + rpsFilter + " )";
                  }

                  // StepPlans and RunPlans do not share id's and can exist without each other, They can however share a plan in general
                  // i.e. A plan that is a combination of RunPlans and StepPlans
                  if(!_.isEmpty(spsFilter) &&
                     _.isEmpty(rpsFilter)){
                      finalQuery += " WHERE `plan` IN ( SELECT `plan` FROM `StepPlans` WHERE " + spsFilter + " )";
                  } else if(!_.isEmpty(spsFilter)){
                      finalQuery += " AND `plan` IN ( SELECT `plan` FROM `StepPlans` WHERE " + spsFilter + " )";
                  }

                  if(!_.isEmpty(rplFilter) &&
                     _.isEmpty(spsFilter) &&
                     _.isEmpty(rpsFilter)){
                      finalQuery += " WHERE `planid` IN ( SELECT `runplanid` FROM `RunPlanLinks` WHERE " + rplFilter + " )";
                  } else if(!_.isEmpty(rplFilter)){
                      finalQuery += " AND `planid` IN ( SELECT `runplanid` FROM `RunPlanLinks` WHERE " + rplFilter + " )";
                  }

                  if(!_.isEmpty(runFilter) &&
                     _.isEmpty(rplFilter) &&
                     _.isEmpty(spsFilter) &&
                     _.isEmpty(rpsFilter)){
                      finalQuery += " WHERE `testcase` IN ( SELECT `testcase` FROM `GroupInfo` WHERE " + runFilter + " )";
                  } else if(!_.isEmpty(runFilter)){
                      finalQuery += " AND `testcase` IN ( SELECT `testcase` FROM `GroupInfo` WHERE " + runFilter + " )";
                  }

                  finalQuery += " ORDER BY `planid` " + order;

                  if(!_.isEmpty(attrSelect)){
                    finalQuery = attrSelect + " FROM (" + finalQuery + ") AS T";
                  }

                  debug('[search] finalQuery', finalQuery);
                  return cb(null, finalQuery);

                case "stepplans":

                  var attrs = filters.select || filters.distinct || [],
                      attrSelect;

                  if( !_.isEmpty(attrs) ){
                      attrSelect = buildSelect(attrs, filters.distinct);
                  }

                  var finalQuery = searchSelect + ' FROM `StepPlans`';

                  if(!_.isEmpty(spsFilter)){
                      finalQuery += " WHERE ( " + spsFilter + " )";
                  }

                  // StepPlans and RunPlans do not share id's and can exist without each other, They can however share a plan in general
                  // i.e. A plan that is a combination of RunPlans and StepPlans
                  if(!_.isEmpty(rpsFilter) &&
                     _.isEmpty(spsFilter)){
                      finalQuery += " WHERE `plan` IN ( SELECT `plan` FROM `RunPlans` WHERE " + rpsFilter + " )";
                  } else if(!_.isEmpty(rpsFilter)){
                      finalQuery += " AND `plan` IN ( SELECT `plan` FROM `RunPlans` WHERE " + rpsFilter + " )";
                  }

                  if(!_.isEmpty(splFilter) &&
                     _.isEmpty(spsFilter) &&
                     _.isEmpty(rpsFilter)){
                      finalQuery += " WHERE `planid` IN ( SELECT `stepplanid` FROM `StepPlanLinks` WHERE " + splFilter + " )";
                  } else if(!_.isEmpty(splFilter)){
                      finalQuery += " AND `planid` IN ( SELECT `stepplanid` FROM `StepPlanLinks` WHERE " + splFilter + " )";
                  }

                  if(!_.isEmpty(stepFilter) &&
                     _.isEmpty(splFilter) &&
                     _.isEmpty(spsFilter) &&
                     _.isEmpty(rpsFilter)){
                      finalQuery += " WHERE `scriptname` IN ( SELECT `scriptname` FROM `TestInfo` WHERE " + stepFilter + " )";
                  } else if(!_.isEmpty(stepFilter)){
                      finalQuery += " AND `scriptname` IN ( SELECT `scriptname` FROM `TestInfo` WHERE " + stepFilter + " )";
                  }

                  finalQuery += " ORDER BY `planid` " + order;

                  if(!_.isEmpty(attrSelect)){
                    finalQuery = attrSelect + " FROM (" + finalQuery + ") AS T";
                  }

                  debug('[search] finalQuery', finalQuery);
                  return cb(null, finalQuery);

                case "runplanlinks":

                  var attrs = filters.select || filters.distinct || [],
                      attrSelect;

                  if( !_.isEmpty(attrs) ){
                      attrSelect = buildSelect(attrs, filters.distinct);
                  }

                  var finalQuery = searchSelect + ' FROM `RunPlanLinks`';

                  if(!_.isEmpty(rplFilter)){
                      finalQuery += " WHERE ( " + rplFilter + " )";
                  }

                  // StepPlans and RunPlans do not share id's and can exist without each other, They can however share a plan in general
                  // i.e. A plan that is a combination of RunPlans and StepPlans
                  if(!_.isEmpty(rpsFilter) &&
                     _.isEmpty(rplFilter)){
                      finalQuery += " WHERE `runplanid` IN ( SELECT `planid` FROM `RunPlans` WHERE " + rpsFilter + " )";
                  } else if(!_.isEmpty(rpsFilter)){
                      finalQuery += " AND `runplanid` IN ( SELECT `planid` FROM `RunPlans` WHERE " + rpsFilter + " )";
                  }

                  finalQuery += " ORDER BY `linkid` " + order;

                  if(!_.isEmpty(attrSelect)){
                    finalQuery = attrSelect + " FROM (" + finalQuery + ") AS T";
                  }

                  debug('[search] finalQuery', finalQuery);
                  return cb(null, finalQuery);

                case "stepplanlinks":

                  var attrs = filters.select || filters.distinct || [],
                      attrSelect;

                  if( !_.isEmpty(attrs) ){
                      attrSelect = buildSelect(attrs, filters.distinct);
                  }

                  var finalQuery = searchSelect + ' FROM `StepPlanLinks`';

                  if(!_.isEmpty(splFilter)){
                      finalQuery += " WHERE ( " + splFilter + " )";
                  }

                  // StepPlans and RunPlans do not share id's and can exist without each other, They can however share a plan in general
                  // i.e. A plan that is a combination of RunPlans and StepPlans
                  if(!_.isEmpty(spsFilter) &&
                     _.isEmpty(splFilter)){
                      finalQuery += " WHERE `stepplanid` IN ( SELECT `planid` FROM `StepPlans` WHERE " + spsFilter + " )";
                  } else if(!_.isEmpty(spsFilter)){
                      finalQuery += " AND `stepplanid` IN ( SELECT `planid` FROM `StepPlans` WHERE " + spsFilter + " )";
                  }

                  finalQuery += " ORDER BY `linkid` " + order;

                  if(!_.isEmpty(attrSelect)){
                    finalQuery = attrSelect + " FROM (" + finalQuery + ") AS T";
                  }

                  debug('[search] finalQuery', finalQuery);
                  return cb(null, finalQuery);

                default:
                  var finalQuery = "SELECT * FROM `" + table + "` ORDER BY `id` " + order;
                  debug('[search] finalQuery', finalQuery);
                  return cb(null, finalQuery);
                  
              }// end
           },

           insertRun : function(set, values,  cb){

              if( typeof values === 'function' ){
                cb = values;
                values = null;
              }

              var set = processKeys(set,'GroupInfo',values),
                  testcase = set.testcase,
                  grpid = set.grpid; // not allowed on insert

              set.datetime = isNaN(Date.parse(set.datetime)) ? dateformat( new Date(), DATE_FORMAT_UTC )
                                                            : dateformat( set.datetime, DATE_FORMAT );
              var length = _.keys(set).length;

              debug('[insertRun] set', set );

              if(grpid){
                   return cb(queryErr("ER_PRIMARY_KEY_FOUND_IN_SET")); 
              }

              //schema checks
              if( !testcase ){
                   return cb(queryErr("ER_BAD_FIELD_ERROR")); 
              }

              var finalQuery =  _.reduce(set,function( accQuery, val, key){

                                   accQuery += tick( key ) + ' = ' + quote(val);

                                   if( this.idx++ !== length - 1){
                                     return accQuery += ', ';
                                   }

                                   return accQuery + ' ';

                                 }, 'INSERT INTO `GroupInfo` SET ', { idx  : 0 }).trim();

              debug('[insertRun] ' + finalQuery );
              return cb( null, finalQuery );
           },

           updateRun : function(set, where, cb){

              var set = processKeys(set, 'GroupInfo'),
                  grpid = set.grpid,
                  length = _.keys(set).length;

              debug('[updateRun] set', set );
               //schema checks
              if( grpid !== undefined ) {
                  return cb(queryErr("ER_PRIMARY_KEY_FOUND_IN_SET")); 
              }

              if( length === 0 ){
                  return cb(queryErr("ER_BAD_FIELD_ERROR")); 
              }

              var finalQuery =  _.reduce( set, function( accQuery, val, key){

                                   accQuery += tick( key ) + ' = ' + quote(val);

                                   if( this.idx++ !== length - 1){
                                     return accQuery += ', ';
                                   }

                                   return accQuery + ' ';

                                 }, 'UPDATE `GroupInfo` SET ' ,{ idx  : 0 }).trim();

              //where is a path param and will be set to runId to even hit the
              // route but just in case
              var where = processKeys(where,'GroupInfo');
                  grpid = where.grpid;
                  length = _.keys(where).length;

              debug('[updateRun] where', where );
              
              if( length < 1 || grpid === undefined ){
                  return cb(queryErr("ER_BAD_FIELD_ERROR")); 
              }

              finalQuery += _.reduce( where , function(accWhereStr,val,key){

                 accWhereStr += tick( key ) + ' = ' + quote(val);
                 
                 if( this.idx++ !== length - 1 ){
                   return accWhereStr += ' AND ';
                 }

                 return accWhereStr;

             },' WHERE ',{ idx  : 0 });

              debug('[updateRun] ' + finalQuery );
              return cb( null, finalQuery );
           },

           getRuns : function( where, cb){

             var where = processKeys(where,'GroupInfo'),
                 grpid = where.grpid,
                 testcase = where.testcase,
                 groupname = where.groupname,
                 length = _.keys( where ).length;
                 

              debug('[getRuns] where', where );

              if( !testcase && !groupname && grpid === undefined ){
                   return cb(queryErr("ER_BAD_FIELD_ERROR")); 
              }

              var finalQuery = _.reduce( where , function(accWhereStr,val,key){

                 accWhereStr += tick( key ) + ' = ' + quote(val);
                 
                 if( this.idx++ !== length - 1 ){
                   return accWhereStr += ' AND ';
                 }

                 return accWhereStr;

             },'SELECT * FROM `GroupInfo` WHERE ',{ idx  : 0 }).trim();


             debug('[getRuns]',  finalQuery);
             return cb( null, finalQuery );
           },

           getRunExists : function( where, cb ){

             var where = processKeys(where,'GroupInfo'),
                 grpid = where.grpid,
                 length = _.keys( where ).length;
                 

              debug('[getRunExists] where', where );

              if( grpid === undefined ){
                   return cb(queryErr("ER_BAD_FIELD_ERROR")); 
              }

              var finalQuery = _.reduce( where , function(accWhereStr,val,key){

                 accWhereStr += tick( key ) + ' = ' + quote(val);
                 
                 if( this.idx++ !== length - 1 ){
                   return accWhereStr += ' AND ';
                 }

                 return accWhereStr;

             },'SELECT Count(`grpid`) AS `grpexists` FROM `GroupInfo` WHERE ',{ idx  : 0 }).trim();

             debug('[getRunExists] finalQuery:',  finalQuery);
             return cb( null, finalQuery );
           },

           insertRunPlan : function(set, cb){

              var set = processKeys( set ),
                  planid = set.planid,
                  plan = set.plan,
                  testcase = set.testcase,
                  length = _.keys(set).length;

              debug('[insertRunPlan] set', set );

               //schema checks
               if( planid !== undefined ||
                   !plan ||
                   !testcase ){
   
                   return cb(queryErr("ER_BAD_FIELD_ERROR")); 
              }

              var finalQuery =  _.reduce(set,function( accQuery, val, key){

                                   accQuery += tick(key) + ' = ' + quote(val);

                                   if( this.idx++ !== length - 1){
                                     return accQuery += ', ';
                                   }

                                   return accQuery + ' ';

                                 }, 'INSERT INTO `RunPlans` SET ' ,{ idx  : 0 }).trim();

              debug('[insertRunPlan] finalQuery', finalQuery );
              return cb( null, finalQuery );
           },

           updateRunPlan : function(set, where, cb){

              var set = processKeys(set),
                  planid = set.planid;

              var length = _.keys(set).length;

              debug('[updateRunPlan] set', set );

              if( _.isEmpty(set) ){
                  return cb(queryErr("ER_BAD_FIELD_ERR")); 
              }
              //this is a prob because you can acidentally reserve a pkey that does not 
              // belong to you
              if(  planid !== undefined ){
                  return cb(queryErr("ER_PRIMARY_KEY_FOUND_IN_SET")); 
              }

              var finalQuery =  _.reduce( set, function( accQuery, val, key){

                                   accQuery += tick(key) + ' = ' + quote(val);

                                   if( this.idx++ !== length - 1){
                                     return accQuery += ', ';
                                   }

                                   return accQuery + ' ';

                                 }, 'UPDATE `RunPlans` SET ' ,{ idx  : 0 }).trim();

              //where is a path param and will be set to runId to even hit the
              // route but just in case
              var where = processKeys(where),
                  planid = where.planid,
                  length = _.keys(where).length;

              debug('[updateRunPlan] where', where );

              if( planid === undefined ){
                  return cb(queryErr("ER_BAD_FIELD_ERROR")); 
              }

              finalQuery += _.reduce( where , function(accWhereStr,val,key){

                 accWhereStr += tick(key) + ' = ' + quote(val);
                 
                 if( this.idx++ !== length - 1 ){
                   return accWhereStr += ' AND ';
                 }

                 return accWhereStr;

             },' WHERE ',{ idx  : 0 });

              debug('[updateRunPlan] ' + finalQuery );
              return cb( null, finalQuery );
           },

           getRunPlans : function( where, cb){

             var where = processKeys(where),
                 planid = where.planid,
                 plan = where.plan,
                 length = _.keys( where ).length;
                 

              debug('[getRunPlans] where', where );

              if( !plan && planid === undefined ){
                   return cb(queryErr("ER_BAD_FIELD_ERROR")); 
              }

              var finalQuery = _.reduce( where , function(accWhereStr,val,key){

                 accWhereStr += tick( key ) + ' = ' + quote(val);
                 
                 if( this.idx++ !== length - 1 ){
                   return accWhereStr += ' AND ';
                 }

                 return accWhereStr;

             },'SELECT * FROM `RunPlans` WHERE ',{ idx  : 0 }).trim();


             debug('[getRunPlans]',  finalQuery);
             return cb( null, finalQuery );
           },

           deleteRunPlan : function( where, cb ){

              var where = processKeys(where),
                  planid = where.planid,
                  length = _.keys(where).length;

              debug('[deleteRunPlan] where', where );

              if( planid === undefined ){
                  return cb(queryErr("ER_BAD_FIELD_ERROR"));
              }

              var finalQuery =  _.reduce(where,function( accQuery, val, key){

                                   accQuery += tick(key) + ' = ' + quote(val);

                                   if( this.idx++ !== length - 1){
                                       return accQuery += ' AND ';
                                   }

                                   return accQuery;

                                }, 'DELETE FROM `RunPlans` WHERE ' ,{ idx  : 0 }).trim();

              debug('[deleteRunPlan] finalQuery', finalQuery );

              return cb( null, finalQuery );
           },

           insertStepPlan : function(set, cb){

              var set = processKeys( set ),
                  planid = set.planid,
                  plan = set.plan,
                  scriptname = set.scriptname,
                  length = _.keys(set).length;

              debug('[insertStepPlan] set', set );

               //schema checks
               if( planid !== undefined ||
                   !plan ||
                   !scriptname ){
   
                   return cb(queryErr("ER_BAD_FIELD_ERROR")); 
              }

              var finalQuery =  _.reduce(set,function( accQuery, val, key){

                                   accQuery += tick(key) + ' = ' + quote(val);

                                   if( this.idx++ !== length - 1){
                                     return accQuery += ', ';
                                   }

                                   return accQuery + ' ';

                                 }, 'INSERT INTO `StepPlans` SET ' ,{ idx  : 0 }).trim();

              debug('[insertStepPlan] finalQuery', finalQuery );
              return cb( null, finalQuery );
           },

           updateStepPlan : function(set, where, cb){

              var set = processKeys(set),
                  planid = set.planid;

              var length = _.keys(set).length;

              debug('[updateStepPlan] set', set );

              if( _.isEmpty(set) ){
                  return cb(queryErr("ER_BAD_FIELD_ERR")); 
              }
              //this is a prob because you can acidentally reserve a pkey that does not 
              // belong to you
              if(  planid !== undefined ){
                  return cb(queryErr("ER_PRIMARY_KEY_FOUND_IN_SET")); 
              }

              var finalQuery =  _.reduce( set, function( accQuery, val, key){

                                   accQuery += tick(key) + ' = ' + quote(val);

                                   if( this.idx++ !== length - 1){
                                     return accQuery += ', ';
                                   }

                                   return accQuery + ' ';

                                 }, 'UPDATE `StepPlans` SET ' ,{ idx  : 0 }).trim();

              //where is a path param and will be set to runId to even hit the
              // route but just in case
              var where = processKeys(where),
                  planid = where.planid,
                  length = _.keys(where).length;

              debug('[updateStepPlan] where', where );

              if( planid === undefined ){
                  return cb(queryErr("ER_BAD_FIELD_ERROR")); 
              }

              finalQuery += _.reduce( where , function(accWhereStr,val,key){

                 accWhereStr += tick(key) + ' = ' + quote(val);
                 
                 if( this.idx++ !== length - 1 ){
                   return accWhereStr += ' AND ';
                 }

                 return accWhereStr;

             },' WHERE ',{ idx  : 0 });

              debug('[updateStepPlan] ' + finalQuery );
              return cb( null, finalQuery );
           },

           getStepPlans : function( where, cb ){

             var where = processKeys(where),
                 planid = where.planid,
                 plan = where.plan,
                 length = _.keys( where ).length;
                 

              debug('[getStepPlans] where', where );

              if( !plan && planid === undefined ){
                   return cb(queryErr("ER_BAD_FIELD_ERROR")); 
              }

              var finalQuery = _.reduce( where , function(accWhereStr,val,key){

                 accWhereStr += tick( key ) + ' = ' + quote(val);
                 
                 if( this.idx++ !== length - 1 ){
                   return accWhereStr += ' AND ';
                 }

                 return accWhereStr;

             },'SELECT * FROM `StepPlans` WHERE ',{ idx  : 0 }).trim();


             debug('[getStepPlans]',  finalQuery);
             return cb( null, finalQuery );
           },

           deleteStepPlan : function( where, cb ){

              var where = processKeys(where),
                  planid = where.planid,
                  length = _.keys(where).length;

              debug('[deleteStepPlan] where', where );

              if( planid === undefined ){
                  return cb(queryErr("ER_BAD_FIELD_ERROR"));
              }

              var finalQuery =  _.reduce(where,function( accQuery, val, key){

                                   accQuery += tick(key) + ' = ' + quote(val);

                                   if( this.idx++ !== length - 1){
                                       return accQuery += ' AND ';
                                   }

                                   return accQuery;

                                }, 'DELETE FROM `StepPlans` WHERE ' ,{ idx  : 0 }).trim();

              debug('[deleteStepPlan] finalQuery', finalQuery );

              return cb( null, finalQuery );
           },

           insertRunPlanLink : function(set, cb){

              var set = processKeys( set ),
                  linkid = set.linkid,
                  runplanid = set.runplanid,
                  linkurl = set.linkurl,
                  length = _.keys(set).length;

              debug('[insertRunPlanLink] set', set );

               //schema checks
               if( linkid !== undefined ||
                   runplanid === undefined ||
                   isNaN(runplanid) ||
                   !linkurl ){
                   return cb(queryErr("ER_BAD_FIELD_ERROR")); 
              }

              var finalQuery =  _.reduce(set,function( accQuery, val, key){

                                   accQuery += tick(key) + ' = ' + quote(val);

                                   if( this.idx++ !== length - 1){
                                     return accQuery += ', ';
                                   }

                                   return accQuery + ' ';

                                 }, 'INSERT INTO `RunPlanLinks` SET ' ,{ idx  : 0 }).trim();

              debug('[insertRunPlanLink] finalQuery', finalQuery );
              return cb( null, finalQuery );
           },

           updateRunPlanLink : function(set, where, cb){

              var set = processKeys(set),
                  linkid = set.linkid,
                  runplanid = set.runplanid,
                  length = _.keys(set).length;

              debug('[updateRunPlanLink] set', set );

              if( _.isEmpty(set) ){
                  return cb(queryErr("ER_BAD_FIELD_ERR")); 
              }
              //this is a prob because you can acidentally reserve a pkey that does not 
              // belong to you
              if(  linkid !== undefined || runplanid !== undefined  ){
                  return cb(queryErr("ER_PRIMARY_KEY_FOUND_IN_SET")); 
              }

              var finalQuery =  _.reduce( set, function( accQuery, val, key){

                                   accQuery += tick(key) + ' = ' + quote(val);

                                   if( this.idx++ !== length - 1){
                                     return accQuery += ', ';
                                   }

                                   return accQuery + ' ';

                                 }, 'UPDATE `RunPlanLinks` SET ' ,{ idx  : 0 }).trim();

              //where is a path param and will be set to runId to even hit the
              // route but just in case
              var where = processKeys(where),
                  linkid = where.linkid,
                  length = _.keys(where).length;

              debug('[updateRunPlanLink] where', where );

              if( linkid === undefined ){
                  return cb(queryErr("ER_BAD_FIELD_ERROR")); 
              }

              finalQuery += _.reduce( where , function(accWhereStr,val,key){

                 accWhereStr += tick(key) + ' = ' + quote(val);
                 
                 if( this.idx++ !== length - 1 ){
                   return accWhereStr += ' AND ';
                 }

                 return accWhereStr;

             },' WHERE ',{ idx  : 0 });

              debug('[updateRunPlanLink] ' + finalQuery );
              return cb( null, finalQuery );
           },

           getRunPlanLinks : function( where, cb ){

              var where = processKeys(where),
                  linkid = where.linkid,
                  runplanid = where.runplanid,
                  length = _.keys( where ).length;
                 

              debug('[getRunPlanLinks] where', where );

              if( linkid === undefined && runplanid === undefined ){
                   return cb(queryErr("ER_BAD_FIELD_ERROR")); 
              }

              var finalQuery = _.reduce( where , function(accWhereStr,val,key){

                 accWhereStr += tick( key ) + ' = ' + quote(val);
                 
                 if( this.idx++ !== length - 1 ){
                   return accWhereStr += ' AND ';
                 }

                 return accWhereStr;

             },'SELECT * FROM `RunPlanLinks` WHERE ',{ idx  : 0 }).trim();


             debug('[getRunPlanLinks]',  finalQuery);
             return cb( null, finalQuery );
           },

           deleteRunPlanLinks : function( where, cb ){

              var where = processKeys(where),
                  runplanid = where.runplanid,
                  linkid = where.linkid,
                  length = _.keys(where).length;

              debug('[deleteRunPlanLinks] where', where );

              if( runplanid === undefined && linkid === undefined ){
                  return cb(queryErr("ER_BAD_FIELD_ERROR"));
              }

              var finalQuery =  _.reduce(where,function( accQuery, val, key){

                                   accQuery += tick(key) + ' = ' + quote(val);

                                   if( this.idx++ !== length - 1){
                                       return accQuery += ' AND ';
                                   }

                                   return accQuery;

                                }, 'DELETE FROM `RunPlanLinks` WHERE ' ,{ idx  : 0 }).trim();

              debug('[deleteRunPlanLinks] finalQuery', finalQuery );

              return cb( null, finalQuery );
           },

           insertStepPlanLink : function(set, cb){

             var set = processKeys( set ),
                 linkid = set.linkid,
                 stepplanid = set.stepplanid,
                 linkurl = set.linkurl,
                 length = _.keys(set).length;

              debug('[insertStepPlanLink] set', set );

               //schema checks
               if( linkid !== undefined ||
                   stepplanid === undefined ||
                   isNaN(stepplanid) ||
                   !linkurl ){
                   return cb(queryErr("ER_BAD_FIELD_ERROR")); 
              }

              var finalQuery =  _.reduce(set,function( accQuery, val, key){

                                   accQuery += tick(key) + ' = ' + quote(val);

                                   if( this.idx++ !== length - 1){
                                     return accQuery += ', ';
                                   }

                                   return accQuery + ' ';

                                 }, 'INSERT INTO `StepPlanLinks` SET ' ,{ idx  : 0 }).trim();

              debug('[insertStepPlanLink] finalQuery', finalQuery );
              return cb( null, finalQuery );
           },

           updateStepPlanLink : function(set, where, cb){

              var set = processKeys(set),
                  linkid = set.linkid,
                  stepplanid = set.stepplanid,
                  length = _.keys(set).length;

              debug('[updateStepPlanLink] set', set );

              if( _.isEmpty(set) ){
                  return cb(queryErr("ER_BAD_FIELD_ERR")); 
              }
              //this is a prob because you can acidentally reserve a pkey that does not 
              // belong to you
              if(  linkid !== undefined || stepplanid !== undefined  ){
                  return cb(queryErr("ER_PRIMARY_KEY_FOUND_IN_SET")); 
              }

              var finalQuery =  _.reduce( set, function( accQuery, val, key){

                                   accQuery += tick(key) + ' = ' + quote(val);

                                   if( this.idx++ !== length - 1){
                                     return accQuery += ', ';
                                   }

                                   return accQuery + ' ';

                                 }, 'UPDATE `StepPlanLinks` SET ' ,{ idx  : 0 }).trim();

              //where is a path param and will be set to runId to even hit the
              // route but just in case
              var where = processKeys(where),
                  linkid = where.linkid,
                  length = _.keys(where).length;

              debug('[updateStepPlanLink] where', where );

              if( linkid === undefined ){
                  return cb(queryErr("ER_BAD_FIELD_ERROR")); 
              }

              finalQuery += _.reduce( where , function(accWhereStr,val,key){

                 accWhereStr += tick(key) + ' = ' + quote(val);
                 
                 if( this.idx++ !== length - 1 ){
                   return accWhereStr += ' AND ';
                 }

                 return accWhereStr;

             },' WHERE ',{ idx  : 0 });

              debug('[updateStepPlanLink] ' + finalQuery );
              return cb( null, finalQuery );
           },

           getStepPlanLinks : function( where, cb ){

             var where = processKeys(where),
                 linkid = where.linkid,
                 stepplanid = where.stepplanid,
                 length = _.keys( where ).length;
                 

              debug('[getStepPlanLinks] where', where );

              if( linkid === undefined && stepplanid === undefined ){
                   return cb(queryErr("ER_BAD_FIELD_ERROR")); 
              }

              var finalQuery = _.reduce( where , function(accWhereStr,val,key){

                 accWhereStr += tick( key ) + ' = ' + quote(val);
                 
                 if( this.idx++ !== length - 1 ){
                   return accWhereStr += ' AND ';
                 }

                 return accWhereStr;

             },'SELECT * FROM `StepPlanLinks` WHERE ',{ idx  : 0 }).trim();


             debug('[getStepPlanLinks]',  finalQuery);
             return cb( null, finalQuery );
           },

           deleteStepPlanLinks : function( where, cb ){

              var where = processKeys(where),
                  stepplanid = where.stepplanid,
                  linkid = where.linkid,
                  length = _.keys(where).length;

              debug('[deleteStepPlanLinks] where', where );

              if( stepplanid === undefined && linkid === undefined ){
                  return cb(queryErr("ER_BAD_FIELD_ERROR"));
              }

              var finalQuery =  _.reduce(where,function( accQuery, val, key){

                                   accQuery += tick(key) + ' = ' + quote(val);

                                   if( this.idx++ !== length - 1){
                                       return accQuery += ' AND ';
                                   }

                                   return accQuery;

                                }, 'DELETE FROM `StepPlanLinks` WHERE ' ,{ idx  : 0 }).trim();

              debug('[deleteStepPlanLinks] finalQuery', finalQuery );

              return cb( null, finalQuery );
           },

           insertStep : function(set, params, cb){

             var set = processKeys( _.extend(set, params),'TestInfo' ),
                 grpid = set.grpid,
                 testid = set.testid,
                 testcase = set.testcase;

             set.datetime = isNaN(Date.parse(set.datetime)) ? dateformat( new Date(), DATE_FORMAT_UTC )
                                                            : dateformat( set.datetime, DATE_FORMAT );
             /* pretty verbose but users input scares me
              * > v
              *   ',   ,  ,, hey,bye, here ,there ,, ,se e,, ,,  '
              * > c = v.trim().replace(/^[, ]+|[, ]+$/g,'').replace(/\s+,|,\s+/g,',').replace(/,+/g,',').split(/,/g);
              *  [ 'hey', 'bye', 'here', 'there', 'se e' ]
              * > uds.chain(c).flatten().filter(function(elem){ return uds.isString(elem);}).value().join();
              *  'hey,bye,here,there,se e'
              * so scripty such program
              */
             if( set.samparamfile && (_.isArray(set.samparamfile) || _.isString(set.samparamfile)) ){

               set.samparamfile =  _.isArray(set.samparamfile) ? set.samparamfile : set.samparamfile
                                                                                    .trim()
                                                                                    .replace(/^[, ]+|[, ]+$/g,'') //trailing/ending , or space
                                                                                   .replace(/\s+,|,\s+/g,',') //only spaces next to commas
                                                                                    .replace(/,+/g,',') // duplicate commas to single since prev creates them
                                                                                    .split(/,/g);

               set.samparamfile = _.chain(set.samparamfile)
                                   .flatten().filter(function(elem){ return _.isString(elem);}).value().join();
             } else {
               delete set.samparamfile; //throw away
             }
  
             var length = _.keys(set).length;

             debug('[insertStep] set', set );

             if( grpid === undefined || testid !== undefined || !testcase ){
                  return cb(queryErr("ER_BAD_FIELD_ERROR")); 
             }

             var finalQuery =  _.reduce(set,function( accQuery, val, key){

                                   accQuery += tick(key) + ' = ' + quote(val);

                                   if( this.idx++ !== length - 1){
                                     return accQuery += ', ';
                                   }

                                   return accQuery + ' ';

                                 }, 'INSERT INTO `TestInfo` SET ' ,{ idx  : 0 }).trim();

             debug('[insertStep] ' + finalQuery );
             return cb( null, finalQuery );
           },

           updateStep : function(set, where, cb){

              var set = processKeys(set,'TestInfo'),
                  grpid = set.grpid,
                  testid = set.testid;

              // pretty verbose but users input scares me
              if( set.samparamfile && _.isArray(set.samparamfile) || _.isString(set.samparamfile) ){

                set.samparamfile =  _.isArray(set.samparamfile) ? set.samparamfile : set.samparamfile
                                                                                     .trim()
                                                                                     .replace(/^[, ]+|[, ]+$/g,'')
                                                                                     .replace(/\s+,|,\s+/g,',')
                                                                                     .replace(/,+/g,',')
                                                                                     .split(/,/g);

                set.samparamfile = _.chain(set.samparamfile)
                                    .flatten().filter(function(elem){ return _.isString(elem);})
                                    .value().join();
             } else {
               delete set.samparamfile;
             }

              var length = _.keys(set).length;

              debug('[updateStep] set', set );

              if( _.isEmpty(set) ){
                  return cb(queryErr("ER_BAD_FIELD_ERR")); 
              }
              //this is a prob because you can acidentally reserve a pkey that does not 
              // belong to you
              if(  grpid !== undefined || testid !== undefined ){
                  return cb(queryErr("ER_PRIMARY_KEY_FOUND_IN_SET")); 
              }

              var finalQuery =  _.reduce( set, function( accQuery, val, key){

                                   accQuery += tick(key) + ' = ' + quote(val);

                                   if( this.idx++ !== length - 1){
                                     return accQuery += ', ';
                                   }

                                   return accQuery + ' ';

                                 }, 'UPDATE `TestInfo` SET ' ,{ idx  : 0 }).trim();

              //where is a path param and will be set to runId to even hit the
              // route but just in case
              var where = processKeys(where,'TestInfo');
                  grpid = where.grpid;
                  testid = where.testid;
                  length = _.keys(where).length;

              debug('[updateStep] where', where );

              if( grpid === undefined || testid === undefined ){
                  return cb(queryErr("ER_BAD_FIELD_ERROR")); 
              }

              finalQuery += _.reduce( where , function(accWhereStr,val,key){

                 accWhereStr += tick(key) + ' = ' + quote(val);
                 
                 if( this.idx++ !== length - 1 ){
                   return accWhereStr += ' AND ';
                 }

                 return accWhereStr;

             },' WHERE ',{ idx  : 0 });

              debug('[updateStep] ' + finalQuery );
              return cb( null, finalQuery );
           },

           getSteps : function( where, cb){

             var where = processKeys(where,'TestInfo'),
                 grpid = where.grpid,
                 testcase = where.testcase,
                 scriptname = where.scriptname,
                 length = _.keys( where ).length;
                 

              debug('[getSteps] where', where );

              if( grpid === undefined && !testcase && !scriptname ){
                   return cb(queryErr("ER_BAD_FIELD_ERROR")); 
              }

              var finalQuery = _.reduce( where , function(accWhereStr,val,key){

                 accWhereStr += tick(key) + ' = ' + quote(val);
                 
                 if( this.idx++ !== length - 1 ){
                   return accWhereStr += ' AND ';
                 }

                 return accWhereStr;

             },'SELECT * FROM `TestInfo` WHERE ',{ idx  : 0 }).trim();


             debug('[getSteps]', finalQuery);
             return cb( null, finalQuery );
           },

           getStepExists : function( where, cb){

             var where = processKeys(where,'TestInfo'),
                 grpid = where.grpid,
                 testid = where .testid,
                 length = _.keys( where ).length;
                 

              debug('[getStepExists] where', where );

              if( grpid === undefined  || testid === undefined ){
                   return cb(queryErr("ER_BAD_FIELD_ERROR")); 
              }

              var finalQuery = _.reduce( where, function(accWhereStr,val,key){

                 accWhereStr += tick(key) + ' = ' + quote(val);
                 
                 if( this.idx++ !== length - 1 ){
                   return accWhereStr += ' AND ';
                 }

                 return accWhereStr;

             },'SELECT Count(*) AS `stepexists` FROM `TestInfo` WHERE ',{ idx  : 0 }).trim();


             debug('[getStepExists]', finalQuery);
             return cb( null, finalQuery );
           },

           getNextStep : function( where, cb){

             var where = processKeys(where,'TestInfo'),
                 grpid = where.grpid,
                 length = _.keys( where ).length;
                 

              debug('[getNextStep] where', where );

              if( grpid === undefined ){
                   return cb(queryErr("ER_BAD_FIELD_ERROR")); 
              }

              var finalQuery = _.reduce( where , function(accWhereStr,val,key){

                 accWhereStr += tick(key) + ' = ' + quote(val);
                 
                 if( this.idx++ !== length - 1 ){
                   return accWhereStr += ' AND ';
                 }

                 return accWhereStr;
          
             },'SELECT Max(`testid`) + 1 AS `nexttestid` FROM `TestInfo` WHERE ',{ idx  : 0 }).trim(); //returns null if no testinfo for grp exists


             debug('[getNextStep]', finalQuery);
             return cb( null, finalQuery );
           },

           getVerificationPoints : function( where, cb){

             var where = processKeys(where), 
                 name = where.name,
                 id   = where.id,
                 grpid   = where.grpid,
                 length = _.keys(where).length;

             debug('[getVerificationPoints] where',  where);

             if( !name && grpid === undefined && id === undefined ){
                return cb(queryErr("ER_BAD_FIELD_ERR"));
             }

             var finalQuery =  _.reduce( where , function(accWhereStr,val,key){

                 accWhereStr += tick(key) + ' = ' + quote(val);
                 
                 if( this.idx++ !== length - 1 ){
                     return accWhereStr += ' AND ';
                 }

                 return accWhereStr;

             },'SELECT * FROM `VerificationPoints` WHERE ',{ idx  : 0 }).trim();


             debug('[getVerificationPoints] finalQuery',  finalQuery);
             return cb( null, finalQuery );
           },

           insertVerificationPoint : function(set, params, cb){
             
              //remove depreciated set.grpid/testid checks 
              var set = processKeys( _.extend(set, params) ),
                  id = set.id,
                  grpid =  set.grpid,
                  testid = set.testid,
                  name = set.name,
                  result = set.result;

             set.datetime = isNaN(Date.parse(set.datetime)) ? dateformat( new Date(), DATE_FORMAT_UTC )
                                                              : dateformat( set.datetime, DATE_FORMAT );
             var length = _.keys(set).length;

              debug('[insertVerificationPoint] set', set );
              
               if( id ){
                   return cb(queryErr("ER_PRIMARY_KEY_FOUND_IN_SET")); 
               }
 
               if( grpid === undefined  ||
                   testid === undefined ||
                   !name   || 
                   !result ){
   
                   return cb(queryErr("ER_BAD_FIELD_ERROR")); 
              }

              var finalQuery =  _.reduce(set,function( accQuery, val, key){

                                   accQuery += tick(key) + ' = ' + quote(val);

                                   if( this.idx++ !== length - 1){
                                     return accQuery += ', ';
                                   }

                                   return accQuery + ' ';

                                 }, 'INSERT INTO `VerificationPoints` SET ' ,{ idx  : 0 }).trim();

              debug('[insertVerificationPoint] finalQuery', finalQuery );
              return cb( null, finalQuery );
           },

           insertVersionInfo : function(set, params, cb){
  
              var set = processKeys( _.extend(set, params) ),
                  grpid = set.grpid,
                  name = set.name,
                  type = set.type,
                  length = _.keys(set).length;

              debug('[insertVersionInfo] set', set );

               //schema checks
               if( grpid === undefined || 
                   !name  ||
                   !type ){
   
                   return cb(queryErr("ER_BAD_FIELD_ERROR")); 
              }

              var finalQuery =  _.reduce(set,function( accQuery, val, key){

                                   accQuery += tick(key) + ' = ' + quote(val);

                                   if( this.idx++ !== length - 1){
                                     return accQuery += ', ';
                                   }

                                   return accQuery + ' ';

                                 }, 'INSERT INTO `VersionInfo` SET ' ,{ idx  : 0 }).trim();

              debug('[insertVersionInfo] finalQuery', finalQuery );
              return cb( null, finalQuery );
           },

           getVersionInfo : function( where, cb){

             var where = processKeys(where),
                 grpid   = where.grpid,
                 name = where.name,
                 length = _.keys(where).length;

             debug('[getVersionInfo] where',  where);

             if( grpid === undefined && !name ){
                return cb(queryErr("ER_BAD_FIELD_ERROR"));
             }

             var finalQuery =  _.reduce( where , function(accWhereStr,val,key){

                 accWhereStr += tick(key) + ' = ' + quote(val);
                 
                 if( this.idx++ !== length - 1 ){
                     return accWhereStr += ' AND ';
                 }

                 return accWhereStr;

             },'SELECT * FROM `VersionInfo` WHERE ',{ idx  : 0 }).trim();


             debug('[getVersionInfo] finalQuery',  finalQuery);
             return cb( null, finalQuery );
           },

           insertAttribute : function( set, params, cb ){

              var set = processKeys( _.extend(set, params) ),
                  grpid = set.grpid,
                  testid = set.testid,
                  name = set.name,
                  value = set.value;

             //not sure if this table will have this
             //set.timestamp = isNaN(Date.parse(set.timestamp)) ? dateformat( new Date(), DATE_FORMAT_UTC )
             //                                                 : dateformat( set.timestamp, DATE_FORMAT );
                                                        
              //taken after all keys are final
              var  length = _.keys(set).length;

              debug('[insertAttribute] set', set );

              if( grpid === undefined ||
                  testid === undefined ||
                  !name ||
                  value === undefined ){
                  return cb(queryErr("ER_BAD_FIELD_ERROR"));
              }


              var finalQuery =  _.reduce(set,function( accQuery, val, key){

                                   accQuery += tick(key) + ' = ' + quote(val);

                                   if( this.idx++ !== length - 1){
                                       return accQuery += ', ';
                                   }

                                   return accQuery + ' ';

                                }, 'INSERT INTO `Attributes` SET ' ,{ idx  : 0 }).trim();

              debug('[insertAttribute] finalQuery', finalQuery );

              return cb( null, finalQuery );
           },

           getAttributes : function( where, cb ){

              var where = processKeys(where),
                  grpid = where.grpid,
                  name = where.name,
                  length = _.keys(where).length;

              debug('[getAttributes] where', where );

              if( !name && grpid === undefined ){
                  return cb(queryErr("ER_BAD_FIELD_ERROR"));
              }

              var finalQuery =  _.reduce(where,function( accQuery, val, key){

                                   accQuery += tick(key) + ' = ' + quote(val);

                                   if( this.idx++ !== length - 1){
                                       return accQuery += ' AND ';
                                   }

                                   return accQuery;

                                }, 'SELECT * FROM `Attributes` WHERE ' ,{ idx  : 0 }).trim();

              debug('[getAttributes] finalQuery', finalQuery );

              return cb( null, finalQuery );
           },

           insertMetric : function( set, cb ){

              var set = processKeys(set),
                  component = set.component,
                  process = set.process,
                  type = set.type,
                  metric = set.metric;

             set.timestamp = isNaN(Date.parse(set.timestamp)) ? dateformat( new Date(), DATE_FORMAT_UTC )
                                                              : dateformat( set.timestamp, DATE_FORMAT );
                                                        
              //taken after all keys are final
              var  length = _.keys(set).length;

              debug('[insertMetric] set', set );

              if( !component ||
                  !process ||
                  !type ||
                  metric === undefined ){
                  return cb(queryErr("ER_BAD_FIELD_ERROR"));
              }


              var finalQuery =  _.reduce(set,function( accQuery, val, key){

                                   accQuery += tick(key) + ' = ' + quote(val);

                                   if( this.idx++ !== length - 1){
                                       return accQuery += ', ';
                                   }

                                   return accQuery + ' ';

                                }, 'INSERT INTO `Metrics` SET ' ,{ idx  : 0 }).trim();

              debug('[insertMetric] finalQuery', finalQuery );

              return cb( null, finalQuery );
           },

           getMetrics : function( where, cb ){

              var where = processKeys(where),
                  component = where.component,
                  process = where.process,
                  grpid = where.grpid,
                  length = _.keys(where).length;

              debug('[getMetrics] where', where );

              if( (!component || !process) && grpid === undefined ){
                  return cb(queryErr("ER_BAD_FIELD_ERROR"));
              }

              var finalQuery =  _.reduce(where,function( accQuery, val, key){

                                   accQuery += tick(key) + ' = ' + quote(val);

                                   if( this.idx++ !== length - 1){
                                       return accQuery += ' AND ';
                                   }

                                   return accQuery;

                                }, 'SELECT * FROM `Metrics` WHERE ' ,{ idx  : 0 }).trim();

              debug('[getMetrics] finalQuery', finalQuery );

              return cb( null, finalQuery );
           },

           deleteMetrics : function( where, cb ){

              var where = processKeys(where),
                  component = where.component,
                  process = where.process,
                  grpid = where.grpid,
                  length = _.keys(where).length;

              debug('[deleteMetrics] where', where );

              if( (!component || !process) && grpid === undefined ){
                  return cb(queryErr("ER_BAD_FIELD_ERROR"));
              }

              var finalQuery =  _.reduce(where,function( accQuery, val, key){

                                   accQuery += tick(key) + ' = ' + quote(val);

                                   if( this.idx++ !== length - 1){
                                       return accQuery += ' AND ';
                                   }

                                   return accQuery;

                                }, 'DELETE FROM `Metrics` WHERE ' ,{ idx  : 0 }).trim();

              debug('[deleteMetrics] finalQuery', finalQuery );

              return cb( null, finalQuery );
           },

           getVipcatVerificationPoints : function( body, cb ){

             /**
              * body = {
              *    name : "name",
              *    filters: {
              *      vpFilter : [['name','=','val','or'],['name','=','val','and'],['name','=','val','logic'],...],
              *      grpFilter: [['attr','op','val','logic'],['attr','op','val','logic'],...],
              *      testFilter: [['attr','op','val','logic'],['attr','op','val','logic'],...]
              *    }
              * }
              * sql only cares about the filters vipcat the name
              */
              var body = processKeys(body);
                  filters = processKeys(body.filters);

              if( _.isNull(filters) || _.isEmpty(filters) ){
                 return cb( queryErr("ER_BAD_FIELD_ERROR") );
              }


              var vpfilter = filters.vpfilter,
                  grpfilter = filters.groupfilter,
                  testfilter = filters.testfilter,
                  MAXVPS = 1000000;

              if( _.isNull(vpfilter) ||
                  !_.isArray(vpfilter) ||
                  _.isEmpty(vpfilter) ) { //req type and name
                  return cb( queryErr("ER_BAD_FIELD_ERROR") );
              }

              debug('[getVipcatVerificationPoints] vpfilter', vpfilter);

              // required filter props for verification points
              var reqs = {'`name`':''},
                  finalQuery = _.reduce(vpfilter, function(accWhereStr, filter, idx){
                                   if( filter instanceof Array && filter.length >= 3 ){
                                       var key = tick(filter[0]),
                                           op  = filter[1],
                                           val = quote(filter[2]),
                                           logic = filter[3] || '';


                                       accWhereStr += key + ' ' + op + ' ' + val;

                                       //checked after all conversions
                                       delete reqs[key];
                                       
                                       if( idx !== vpfilter.length - 1 ){
                                           return accWhereStr += ' ' + logic + ' ';
                                       }
                                   }

                                   return accWhereStr + ' )';

                           },'SELECT * FROM `VerificationPoints` WHERE ( ', {});

              // check reqs
              if(  !_.isEmpty(reqs) ){
                  return cb( queryErr("ER_BAD_FIELD_ERROR") );
              }

              if( grpfilter && _.isArray(grpfilter) && grpfilter.length > 0 ){
                  debug('[getVipcatVerificationPoints] grpfilter',grpfilter);
                  finalQuery += _.reduce(grpfilter,function(accWhereStr,filter,idx){
                                         if( _.isArray(filter) && filter.length >= 3 ){

                                             var key = tick(filter[0],'GroupInfo'),
                                                 op  = filter[1],
                                                 val = quote(filter[2]),
                                                 logic = filter[3] || '';
   
                                             accWhereStr += key + ' ' + op + ' ' + val;
                                             
                                             if( idx !== grpfilter.length - 1 ){
                                               return accWhereStr += ' ' + logic + ' ';
                                             }
                                             return accWhereStr + ')';
                                          }
                                          return accWhereStr;
                                      },' AND `grpID` IN (SELECT `grpid` FROM `GroupInfo` WHERE ',{});
              }

              if( testfilter && _.isArray(testfilter) && testfilter.length > 0 ){
                  debug('[getVipcatVerificationPoints] testfilter',testfilter);
                  finalQuery += _.reduce(testfilter,function(accWhereStr,filter,idx){
                                          if( _.isArray(filter) && filter.length >= 3 ){
                                                 var key = tick(filter[0],'TestInfo'),
                                                     op  = filter[1],
                                                     val = quote(filter[2]),
                                                     logic = filter[3] || '';

                            
                                                 accWhereStr += key + ' ' + op + ' ' + val;
                                                 
                                                 if( idx !== testfilter.length - 1 ){
                                                   return accWhereStr += ' ' + logic + ' ';
                                                 }
                                                 return accWhereStr + ')';
                                              }
                                              return accWhereStr;
                                      },' AND (`testid`,`grpid`) IN (SELECT `testid`,`grpid` FROM `TestInfo` WHERE ',{});

              }

              finalQuery += ' ORDER BY UNIX_TIMESTAMP(`datetime`) DESC LIMIT ' + MAXVPS;

              debug('[getVipcatVerificationPoints] finalquery', finalQuery);

              return cb( null, finalQuery.trim() );
           }
  };
};
