#!/usr/bin/env node

var path       = require('path'),
    stream     = require('stream'),
    zlib       = require('zlib'),
    fs         = require('fs'),
    cp         = require('child_process'),
    _          = require('underscore'),
    async      = require('async'),
    rimraf     = require('rimraf'),
    recursiveRead = require('recursive-readdir'),
    request    = require('request'),
    dateformat = require('dateformat'),
    jwtDecode  = require('jwt-decode'),
    mysql      = require('mysql'),
    csv        = require('csv'),
    cuid       = require('cuid'),
    tar        = require('tar'),
    express    = require('express'),
    expWinston = require('express-winston'),
    bodyParser = require('body-parser'),
    debug      = require('debug'),
    winston    = require('winston'),
    rotateTransport = require('winston-logrotate').Rotate,
    //expanded batools-auth module
    util       = require('util'),
    passport   = require('passport'),
    passportStrat=require('passport-strategy'),
    activeDirectory=require('activedirectory'),
    basicStrategy=require('passport-http').BasicStrategy,
    activeDirectoryStrategy=require('./lib/activeDirectoryStrategy')(passportStrat, util, activeDirectory, debug),
    auth = require('./lib/batools-auth')( passport, activeDirectoryStrategy, basicStrategy, debug);

//custom id for this instance
var serverDebug = debug('server'); // start up

//called after server startup success or failure
var done = function(err,server){ //server init

  // these winston logs will not go to the Rotate file because no requests could be
  // processed yet...

  if(err){  //report and exit if error starting server
    cliLogger.error(err.message);
    process.exit(1);
  }

  cliLogger.info('[done] Successfully started express server');

  db.connect(function(dbConfigsErr){

    if(dbConfigsErr){

      cliLogger.error(dbConfigsErr.message);

      return server.close(function(serverCloseErr){
        if(serverCloseErr){
          cliLogger.error(serverCloseErr.message);
        }
        process.exit(1);
      });
    }

    cliLogger.info('[done] Successfully connected to db');

    //if no listen error server is initalized and listening
    process.on( 'SIGINT', function(){

      // do not use winston in here they will be logged to the Rotate logs
      // because of ... https://github.com/juttle/winston-logrotate/issues/4
      // but otherwise using winston before requests start is ok

      console.log('');
      //gracefully(as reqs finish) end all connections
      db.close(function(dbCloseErr){

        if(dbCloseErr){
          console.log('error:',dbCloseErr.message);
        }

        server.close(function(serverCloseErr){
          if(serverCloseErr){
            console.log('error:',serverCloseErr.message);
          }

          if(serverCloseErr || dbCloseErr){
            console.log('ReDa REST Shutdown with Errors');
            process.exit(1);
          }

          console.log('ReDa REST Shutdown Successfully');
          process.exit(0);
        });
      });
    });

    // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    // this allows a single event to have more than 10 listeners
    // required when many requests are occuring at the same time
    // an exception is thrown in testing without this atm
    process.setMaxListeners(0);
    console.log('ReDa REST Lurking on Port:', PORT);
    // no more winston allowed...
  });
}

//General Server configs
var VERSIONS = { 'Pre-Production' : 'v0' },
    PORT = process.env.PORT || 5000,
    CONNECTION_TIMEOUT = +process.env.CONNECTION_TIMEOUT || 120000, // node default 
    LOG_PATH = process.env.LOG_PATH || '/tmp',
    LOGGING = process.env.LOGGING || 'warn',
    APP_NAME = process.env.APP_NAME || 'test',
    REDA_SCHEMA = process.env.REDA_SCHEMA || 'v3g';

winston.remove(winston.transports.Console);
var cliLogger = new winston.Logger({
    transports: [
        new winston.transports.Console({ colorize: true })
      ],
    level: process.env.LOGGING || 'info'
});
cliLogger.cli();

var app = express();

app.use('/docs',express.static(path.resolve( __dirname, 'public', 'apidoc' )));
 
app.get('/favicon.ico',function(req,res){
  res.status(200).send('img/favicon.ico');
  res.end();
});

app.get('/',function(req,res){
  res.redirect('/docs');
});

app.use(expWinston.logger({
    transports: [
      new rotateTransport({
            file: path.resolve( LOG_PATH, APP_NAME + '-requests.log' ),
            timestamp: true,
            json: true,
            size: '10m',
            keep: 10,
            compress: true
      })
    ],
    statusLevels : {
                      success: "info",   //200 
                      warn   : "warn",  //400
                      error  : "error" //500
                   },
    // currently express-winston does not support whitelisting nested keys
    // https://github.com/bithavoc/express-winston/issues/66
    requestFilter: function(req,propName){
      if(propName === "headers"){
        return Object.keys(req.headers).reduce(function(filteredHeaders, key){
          if(key !== "authorization"){
            filteredHeaders[key] = req.headers[key];
          }
          return filteredHeaders;
        }, {});
      }
      return req[propName];
    },
    requestWhitelist : ["headers", "queryStr", "errMsg", "body", "query", "params", "uid", 'reqId'],
    responseWhitelist: ["statusCode","insertId"]
}));

serverDebug("APP_NAME:", APP_NAME);
serverDebug("REDA_SCHEMA:", REDA_SCHEMA);
serverDebug("LOG_PATH:", LOG_PATH);
serverDebug("CONNECTION_TIMEOUT:", CONNECTION_TIMEOUT); 

//sync
for(var vkey in VERSIONS) {

  // all purpose libs
  try {

    var genPath = path.resolve(__dirname, 'schemas', REDA_SCHEMA, 'schema.json');
    var schema = require(genPath);


    genPath = path.resolve(__dirname, 'lib', 'db-driver.js');
    var db = require(genPath)( schema, mysql, async, _, debug );
    cliLogger.info('[init] Initialized db-driver');

    genPath = path.resolve(__dirname, 'lib', 'databus.js');
    var databus = require(genPath)( path, async, _, fs, jwtDecode, util, request, debug );
    cliLogger.info('[init] Initialized databus');

    genPath = path.resolve(__dirname, 'lib', 'queries.js');
    var queries = require(genPath)( _, dateformat, debug );
    cliLogger.info('[init] Initialized queries');

    genPath = path.resolve(__dirname, 'lib', 'reda-utils.js');
    var redaUtils = require(genPath)( cp, fs, rimraf, recursiveRead, debug );
    cliLogger.info('[init] Initialized reda-utils');

    genPath = path.resolve(__dirname, 'routes', 'api', VERSIONS[vkey] + '.js');
    app.use( path.resolve('/api', VERSIONS[vkey]),
                          require( genPath )( path,
                                              stream,
                                              zlib,
                                              async,
                                              express,
                                              bodyParser,
                                              csv,
                                              cuid,
                                              tar,
                                              auth,
                                              queries,
                                              db,
                                              redaUtils,
                                              databus,
                                              debug ) );

    cliLogger.info('[init] Mounted routes for', VERSIONS[vkey]);
  } catch(e) {
    return done(new Error('[init] Error mounting routes:' + VERSIONS[vkey] + '\n\t' + e.stack || e.message));
  }
}

//handle errors responses
//A NEXT PARAMETER MUST BE PROVIDED EVEN IF NOT USED!!!
/* eslint-disable */
app.use( function clientErrorHandler(err, req, res, next ){  //handle based errors
/* eslint-enable */

  err.status = err.status && typeof err.status === 'number' ? err.status : 501;
  err.message = err.message ? err.message : "No error message provided";

  if(res.headersSent){
      // defer to default error handler for streamaing responses
      // https://github.com/expressjs/expressjs.com/issues/412
      // https://github.com/expressjs/express/issues/2700
      // only the download archive route should trigger this atm
      serverDebug('[clientErrorHandler]', 'Defering to default error handler');
      return next(err);
  }

  if(err.status >= 500 ){
    return next(err);
  }

  serverDebug('[clientErrorHandler]', err.status + ' : ' + err.code + ' : ' + err.message );

  // save for logs
  req.errMsg = err.message;

  res.status(err.status).json({code:err.status,message:err.message});
});

if( LOG_PATH ){
  app.use(expWinston.errorLogger({
    transports: [
          new rotateTransport({
              file: path.resolve( LOG_PATH, APP_NAME + '-errors.log' ),
                timestamp: true,
                json: true,
                size: '2m',
                keep: 10,
                compress: true
          })
        ],
    requestFilter: function(req,propName){
      if(propName === "headers"){
        return Object.keys(req.headers).reduce(function(filteredHeaders, key){
          if(key !== "authorization"){
            filteredHeaders[key] = req.headers[key];
          }
          return filteredHeaders;
        }, {});
      }
      return req[propName];
    },
    showStack: true
  }));
}

//handle server errors responses
//A NEXT PARAMETER MUST BE PROVIDED EVEN IF NOT USED!!!
/* eslint-disable */
app.use(function serverErrorHandler( err, req, res, next ){
/* eslint-enable */


  if(res.headersSent){
      // defer to default error handler for streamaing responses
      // https://github.com/expressjs/expressjs.com/issues/412
      // https://github.com/expressjs/express/issues/2700
      // only the download archive route should trigger this atm
      serverDebug('[serverErrorHandler]', 'Defering to default error handler');
      return next(err);
  }

  serverDebug('[serverErrorHandler]', err.status + ' : ' + err.code + ' : ' + err.message );
  req.errMsg = err.message; // save for logs

  // 500's were logged correctly by this point
  // so mask the message and send
  // 501's are special for pointing out broken or unimplemented features
  if( err.status === 500 ){
    err.message = 'Internal Server Error, See Docs about Bug Reporting';
  } else if( err.status === 501 ){
    err.message = 'Unknown Error Occured, See Docs about Bug Reporting';
  }

  res.status(err.status).json({code:err.status,message:err.message});
});

var server = app.listen( PORT, function(){
  server.timeout = CONNECTION_TIMEOUT; // node default

  return done(null, server); // successful startup
}).on( 'error', function(serverListenErr){

   // node server listen erors
  switch(serverListenErr.code){
    case "EADDRINUSE":
      serverListenErr.message = "Address is currently in use with port, "+ PORT;
      return server.close(done(serverListenErr));
    default:
      return server.close(done(serverListenErr));
  };
});
