module.exports = function(  schema, mysql, async, _, debug ){
  
  var debug = debug('lib:DB');

  var DBHOST = process.env.DBHOST,
      DBPORT = process.env.DBPORT,
      DBUSER = process.env.DBUSER,
      DBPASS = process.env.DBPASS,
      DBNAME = process.env.DBNAME,
      DATABASE_URL = process.env.DATABASE_URL,
      DB_ADMIN_PAGELIMIT = process.env.DB_ADMIN_PAGELIMIT || 10000,
      DB_PAGELIMIT = process.env.DB_PAGELIMIT || 5000;


  var KEY_CONVERSIONS = _.has(schema, 'conversions') ? schema['conversions'] : {},
      KEY_CONSTRAINTS = _.has(schema, 'constraints') ? schema['constraints'] : {}; 

  var CONFIGS = {
    "connectTimeout": 10000,
    "connectionLimit": 80/2, //divide mysql process determined by nginx.conf.sigil and DOKKU_SCALE 
    "acquireTimeout": 20000
  };


  if(DATABASE_URL){
    // need to apply the above configs to the url if using this
    // usually only on prod servers
    debug('[init]','Using db url');
    CONFIGS = process.env.DATABASE_URL + "?" +
             "connectionLimit="   + CONFIGS.connectionLimit + "&" +
             "connectionTimeout=" + CONFIGS.connectTimeout + "&" +
             "aquireTimeout="     + CONFIGS.acquireTimeout;
  } else {

    debug('[init]','Using db env vars');
    CONFIGS.host     = DBHOST || "localhost"; //defualts to localhost
    CONFIGS.port     = DBPORT || 3306;
    CONFIGS.user     = DBUSER;
    CONFIGS.password = DBPASS;
    CONFIGS.database = DBNAME;

    debug('DBHOST:', DBHOST);
    debug('DBNAME:', DBNAME);
    debug('DBUSER:', DBUSER);
  }


  var pool, //connection poll 
      mysqlError = function(code,message){ //translate mysql errors into rest errors

        var err = new Error(message || 'mysql : ' + code);
        err.status = 500;
        switch(code){
          case "ER_NO_REFERENCED_ROW_2":
            err.message = message || 'Error performing query, check request body and params';
            err.status = 400;
            return err;
          case "ER_NO_REFERENCED_ROW":
            err.message = message || 'Error performing query, check request body and params';
            err.status = 400;
            return err;
          case "ER_NO_SUCH_TABLE":
            err.message = message || 'Could not find the specified resource, check that proper ids and params are used';
            err.status = 404;
            return err;
          case "ER_BAD_PAGE_OPTS":
            err.message = message || 'Error bad pageing options supplied, check start/count params';
            err.status = 400;
            return err;
          case "ER_EMPTY_QUERY":
            err.message = message || 'Error performing query, check request body and params';
            err.status = 500;
            return err;
          case "ER_PARSE_ERROR":
            err.message = message || 'Error performing query, check request body and params';
            err.status = 400;
            return err;
          case "ER_BAD_FIELD_ERROR":
            err.message = message || 'Error performing query, check request body and params';
            err.status = 400;
            return err;
          case "ER_BAD_DISTINCT_FIELD_ERROR":
            err.message = message || 'Error performing query, distinct requires a set of json_attrs or a query to filter on';
            err.status = 400;
            return err;
          case "ER_NO_DEFAULT_FOR_FIELD":
            err.message = message || 'Error performing query, missing required value in body/query args';
            err.status = 400;
            return err;
          case "ER_BAD_TABLE_ERROR":
            err.message = message || 'Error performing query, check request body and params';
            err.status = 400;
            return err;
          case "ER_BAD_NULL_ERROR":
            err.message = message || 'Error performing query, check request body and params';
            err.status = 400;
            return err;
          case "ER_UNKNOWN_COM_ERROR":
            err.message = message || 'Error performing query, check request body and params';
            err.status = 400;
            return err;
          case "ENOTFOUND":
            err.message = message || 'Could not find the specified resource, check that proper ids and params are used';
            err.status = 404;
            return err;
          case "ER_FILE_NOT_FOUND":
            err.message = message || 'Could not find the specified resource, check that proper ids and params are used';
            err.status = 404;
            return err;
          case "ER_KEY_NOT_FOUND":
            err.message = message || 'Could not find the specified resource, check that proper ids and params are used';
            err.status = 404;
            return err;
          case "ER_FORM_NOT_FOUND":
            err.message = message || 'Could not find the specified resource, check that proper ids and params are used';
            err.status = 404;
            return err;
          case "ER_DUP_ENTRY":
            err.message = message || 'Duplicate entry found for provided primary key';
            err.status = 400;
            return err;
          case "ER_FT_MATCHING_KEY_NOT_FOUND":
            err.message = message || 'Could not find the specified resource, check that proper ids and params are used';
            err.status = 404;
            return err;
          case "ER_QUERY_TIMEOUT":
            err.message = message || 'The maximum query execution time was reached';
            err.status = 400;
            return err;
          case "ER_PRIMARY_KEY_FOUND_IN_SET":
            err.message = message || 'Error performing query, found primary key in set clause. These are auto generated values';
            err.status = 400;
            return err;
          case "WARN_DATA_TRUNCATED":
            err.message = message || 'Error performing query, Bad enum value or improper query values';
            err.status = 400;
            return err;
          case "PROTOCOL_CONNECTION_LOST":
            err.message = message || 'ReDa Api was disconnected form mysql server';
            err.status = 500;
            return err;
          default: 
            return err;
        };
      },

      convertInputKeys = function( resource, inKeys ){

        debug('[convertInputKeys] inKeys', inKeys);
        debug('[convertInputKeys] resource', resource);

        var outKeys = {
               'schemaKeys' : {},
               'dbKeys': {}
            },
            attributeConversions = KEY_CONVERSIONS['attributes'] || {},
            keyConversions = attributeConversions[resource] || {};

        _.each(inKeys, function( val, key ){
          if( _.has(keyConversions,key) ){
            outKeys['schemaKeys'][key] = val;
            outKeys['dbKeys'][keyConversions[key]] = val;
          }
        });

        return outKeys;
      },

      convertResource = function( resource ){

        var resConversions = KEY_CONVERSIONS['resources'] || {};
        return {
              "schemaRec": resource,
              "dbRec": resConversions[resource] ? resConversions[resource] : resource 
            };
      },

      doesPassConstraints = function( action, resource, schemaKeys ){

        var constraintsAction   = KEY_CONSTRAINTS[action]       || {},
            constraintsRec      = constraintsAction[resource]      || {},
            constraintsBlack    = constraintsRec['blacklist'] || [],
            constraintsRequired = constraintsRec['required']  || [];

        debug('[doesPassConstraints] schemaKeys', schemaKeys);

        if( !_.isEmpty(constraintsBlack) ){

          constraintsBlackFail =  _.some(constraintsBlack, function(badKey) { // or
            return _.has(schemaKeys, badKey);
          });

          if( constraintsBlackFail ){
            debug('[doesPassConstraints] blacklist fail');
            return false;
          }
        }

        if( !_.isEmpty(constraintsRequired) ){

          constraintsRequiredPass = _.some(constraintsRequired, function(reqKeys) { // or

            if( !_.isArray(reqKeys) ){
              reqKeys = [reqKeys];
            }

            return _.every(reqKeys, function(reqKey){ //and
              return _.has(schemaKeys, reqKey);
            });
          });

          if( !constraintsRequiredPass ) {
            debug('[doesPassConstraints] required fail');
            return false;
          }
        }

        return true; 
      },

      convertJsonAttrs = function(attrConversions, attrs){

        if(_.isEmpty(attrs)){
          return {};
        }

        // not everyone must be valid yet will take what works
        return  _.pick(attrConversions, function(val, key){
          return _.contains(attrs, key);
        });
      },

      getAttributeConversions = function(resource){
        var attributeConversions = KEY_CONVERSIONS['attributes'] || {};
        return attributeConversions[resource] || {};
      },

      execute = function(queryStr, cb){
             pool.getConnection(function( connErr, connection ){

               if( connErr ){
                 debug('[execute] conn error',connErr);
                 return cb( mysqlError(connErr.code) );
               }

               debug('[execute]','Connected Successfully');


               debug('[excute] queryStr', queryStr);
               connection.query( queryStr, function( queryErr, rows ) {

                 connection.release(); //returns the connection to the pool

                 if( queryErr ){
                   debug('[execute] query error', queryErr);
                   return cb( mysqlError(queryErr.code) );
                 }

                 debug('[execute]','Successful db query');

                 cb(null, rows);
               });
             });
           };


  return {
           execute: execute,           
           create : function( resource, req,  cb ){

                    if(_.size(req.body) === 0){
                      return cb(mysqlError("ER_BAD_FIELD_ERROR"));
                    }

                    var keys   = convertInputKeys(resource, _.extend(req.body, req.params)),
                        resources = convertResource(resource),
                        schemaKeys = keys['schemaKeys'],
                        schemaRec = resources['schemaRec'];


                    if( !doesPassConstraints('create', schemaRec, schemaKeys ) ){
                      return cb(mysqlError("ER_BAD_FIELD_ERROR"));
                    }

                    var set = keys['dbKeys'],
                        table = resources['dbRec'];

                    debug('[create] set', set);
                   
                    var queryStr = mysql.format('INSERT INTO ' + mysql.escapeId(table) + ' SET ?', set);

                    req.queryStr = queryStr;

                    execute(queryStr, function(queryErr, data){
                      if( queryErr){
                        return cb(queryErr);
                      }
                      return cb(null,data);
                    });
                  },

           exists : function(resource, req, cb) {

                     var where = convertInputKeys(resource, req.params)['dbKeys'],
                         table = convertResource(resource)['dbRec'],
                         filter = new Array( _.size(where) ).fill("?? = ?").join(" AND ");

                     debug('[exists] where', where);

                     var queryStr = 'SELECT Count(*) AS `exists` FROM ' + mysql.escapeId(table) + ' WHERE ' + filter;
                     queryStr = mysql.format(queryStr, _.chain(where)
                                                   .pairs()
                                                   .flatten()
                                                   .value());

                     req.queryStr = queryStr;

                     execute(queryStr, function(queryErr, data){
                       if( queryErr){
                         return cb(queryErr);
                       }
                       return cb(null, +data[0].exists);
                     });
                  },
           read : function( resource, req, cb ){
                  
                    var start = req.query.start || 0,
                        count = req.query.count || DB_PAGELIMIT,
                        role = req.role || 'user';

                    delete req.query.start;
                    delete req.query.count;

                    if( role === "admin" ){
                        count = count <= DB_ADMIN_PAGELIMIT ? count: DB_ADMIN_PAGELIMIT;
                    }

                    if( isNaN(start) ||
                        isNaN(count) ){
                        return cb( mysqlError("ER_BAD_PAGE_OPTS") );
                    }
         
                    debug('[read] paging role:start:count = ', role, ':', start, ':', count);

                    // remove meta query attrs before shcma cnversions
                    var json_attrs = [],
                        distinct = false;
                         
                    if(req.query.json_attrs){
                      try {
                        json_attrs = JSON.parse(req.query.json_attrs);
                        if( !_.isArray(json_attrs) ){
                          json_attrs = [attrs];
                        }
                      } catch(e){
                        json_attrs = [req.query.json_attrs];
                      }
                      delete req.query.json_attrs;
                    }

                    debug('[reda] json_attrs', json_attrs);

                    if(req.query.distinct){
                      distinct = true;
                      delete req.query.distinct;
                    }
                    debug('[reda] distinct', distinct); 

                    debug('[read] req.query', req.query);
                    debug('[read] resource', resource);

                    var keys = convertInputKeys(resource, req.query),
                        resources = convertResource(resource),
                        schemaKeys = keys['schemaKeys'],
                        schemaRec = resources['schemaRec'],
                        attrConversions = getAttributeConversions(resource),
                        schemaAttrs = convertJsonAttrs(attrConversions, json_attrs);

                    //checks for a required key
                    if( !doesPassConstraints( 'read', schemaRec, schemaKeys ) ) { //no valid query key provided
                      if(!distinct){ // distinct provided
                        return cb(mysqlError("ER_BAD_FIELD_ERROR"));
                      }
                      if(_.isEmpty(schemaAttrs)){ // distinct but no valid json attrs provided 
                        return cb(mysqlError("ER_BAD_DISTINCT_FIELD_ERROR"));
                      }
                    } else { // query provided(have at least 1 valid key) 

                      if( _.isEmpty(schemaAttrs) ){ //if no valid provided json attrs use all the schema conversions
                        schemaAttrs = attrConversions; //sneaky... basically the same as '*'
                      }
                    }


                    // here be mysql                   
                    var where = keys['dbKeys'],
                        table = resources['dbRec'],
                        select = schemaAttrs;


                    debug('[read] where', where);

                    var queryStr = 'SELECT ';
                    if(distinct) {
                      queryStr = 'SELECT DISTINCT ';
                    }
                    queryStr += new Array( _.size(select) ).fill("?? AS ??").join(", ");
                    queryStr = mysql.format(queryStr, _.chain(select)
                                                       .invert()
                                                       .pairs()
                                                       .flatten()
                                                       .value());

                    queryStr += ' FROM ' + mysql.escapeId(table);

                    if( !_.isEmpty(where) ){
                      queryStr += ' WHERE ' + new Array( _.size(where) ).fill("?? = ?").join(" AND ");
                      queryStr = mysql.format(queryStr, _.chain(where)
                                                         .pairs()
                                                         .flatten()
                                                         .value());
                    }
                    queryStr += ' LIMIT ' + start + ', ' + count; 
                     
                    req.queryStr = req.queryStr;

                    execute(queryStr, function(queryErr, data){
                      if( queryErr){
                        return cb(queryErr);
                      }
                      return cb(null, data, {start:start, total: data.length});
                    });
                  },

          update : function(resource, req, cb ){

                    if(_.size(req.body) === 0){
                      return cb(mysqlError("ER_BAD_FIELD_ERROR"));
                    }

                    var keys = convertInputKeys(resource, req.body),
                        resources = convertResource(resource),
                        schemaKeys = keys['schemaKeys'],
                        schemaRec = resources['schemaRec'];
                    
                     //checks for a required key
                    if( !doesPassConstraints( 'update', schemaRec, schemaKeys ) ){
                      return cb(mysqlError("ER_BAD_FIELD_ERROR"));
                    }
                   
                    var set   = keys['dbKeys'],
                        where = convertInputKeys(resource, req.params)['dbKeys'],
                        table = resources['dbRec'];

                    debug('[update] set', set);
                    debug('[update] where', where);

                    var queryStr = mysql.format('UPDATE ' + mysql.escapeId(table) + ' SET ? WHERE ', set);
                    queryStr += new Array( _.size(where) ).fill("?? = ?").join(" AND ");
                    queryStr = mysql.format(queryStr, _.chain(where)
                                                       .pairs()
                                                       .flatten()
                                                       .value());
                     
                    req.queryStr = queryStr;

                    execute(queryStr, function(queryErr, data){
                      if( queryErr){
                        return cb(queryErr);
                      }
                      return cb(null,data);
                    });
                  },

          delete : function( resource, req, cb ){

                    /*if(_.size(req.params) === 0){
                      return cb(mysqlError("ER_BAD_FIELD_ERROR"));
                    }*/

                    var keys = convertInputKeys(resource, _.extend(req.query, req.params)),
                        resources  = convertResource(resource),
                        schemaKeys = keys['schemaKeys'],
                        schemaRec = resources['schemaRec'];

                    if( !doesPassConstraints( 'delete', schemaRec, schemaKeys ) ){
                      return cb(mysqlError("ER_BAD_FIELD_ERROR"));
                    }

                    var where = keys['dbKeys'],
                        table = resources['dbRec'];

                    debug('[delete] where', where);

                     var queryStr = 'DELETE FROM ' + mysql.escapeId(table) + ' WHERE ';
                     queryStr +=  new Array( _.size(where) ).fill("?? = ?").join(" AND ");
                     queryStr = mysql.format(queryStr, _.chain(where)
                                                        .pairs()
                                                        .flatten()
                                                        .value());
                                  
                     execute(queryStr, function(queryErr, data){
                       if( queryErr){
                         return cb(queryErr);
                       }
                       return cb(null,data);
                     });
                  },

          connect: function( cb ){ //create connections pool

                     // error before creating pool!!!!!
                     if( _.isEmpty(KEY_CONVERSIONS) || _.isEmpty(KEY_CONSTRAINTS) ){
                         return cb(new Error('Error parsing schema conversions/constraints'));
                     }

                     pool = mysql.createPool(CONFIGS);
                     cb(null);
                   },

          close  : function( cb ){  //gracefully end connections pool

                     pool.end(function(err){

                       if(err){
                         return cb(new Error('Error closing mysql connections \n\t' + err.message));
                       }

                       cb(null);
                     });
                  }
  };
};

