// dependancies
var path       = require('path'),
    stream     = require('stream'),
    zlib       = require('zlib'),
    async      = require('async'), 
    express    = require('express'),
    expWinston = require('express-winston'), // these throw an error if not req
    rotateTransport = require('winston-logrotate').Rotate, // these throw an error if not req
    bodyParser = require('body-parser'),
    _          = require('underscore'),
    dateformat = require('dateformat'),
    csv        = require('csv'),
    cuid       = require('cuid'),
    tar        = require('tar'),
    debug      = require('debug'),
    auth,
    redaUtils;

// dev dependancies
var expect    = require("chai").expect,
    request   = require("supertest");


// libraries
var bootloader = require('../lib/redarest'),
    queries    = require('../lib/queries')(_, dateformat, debug),
    //mock db driver basic for now
    db = function(dbconfigs){

           dbconfigs = dbconfigs || {};

           var readRes  = {
                 Component: 'VenomApi',
                 Process: 'create_network',
                 Metric: 9.8
               },
               writeRes = {
                 affectedRows: 7
               },
               mysqlError = new Error('Mysql Error');
               mysqlError.status = 400;

           return {

             create  : function(qStr,cb){
               if(qStr instanceof Error){
                 return cb( mysqlError );
               }
               return cb(null,writeRes); 
             },

             read  : function(qStr,cb){
               if(qStr instanceof Error){
                 return cb( mysqlError );
               }

               //atm read returns an array or results
               return cb(null, [readRes]); 
             },

             update  : function(qStr,cb){
               if(qStr instanceof Error){
                 return cb( mysqlError );
               }
               return cb(null, writeRes); 
             },

             delete  : function(qStr,cb){
               if(qStr instanceof Error){
                 return cb( mysqlError );
               }
               return cb(null, writeRes); 
             },

             connect : function(cb){

               if( Object.keys(dbconfigs).length === 0 ){
                 return cb(new Error('dbconfigs are required to start service'));
               }

               return cb(null);
             },

             close : function(cb){
               return cb(null);      
             }
           };
         };

/**
 * The test server start up. They requires at least
 * db.connect to be mocked
 */
describe('ReDa REST Startup : ',function(){

  this.slow(5000);

  it('Should successfully startup with default configs',function(done){

     var testdb = db( { db : 'info' } );
  
     bootloader(null, 
                path,
                stream,
                zlib,
                async,
                express,
                expWinston,
                rotateTransport,
                bodyParser,
                csv,
                cuid,
                tar,
                auth,
                queries,
                testdb,
                redaUtils,
                debug,
                function(err,server){ //server init

                  expect(err).to.be.null;
                  expect(server).to.not.be.null;
                  server.close(done);
                });
  });

  it('Should fail if improper db info is given',function(done){
      

     testdb = db( {} );

     bootloader(null,
                path,
                stream,
                zlib,
                async,
                express,
                expWinston,
                rotateTransport,
                bodyParser,
                csv,
                cuid,
                tar,
                auth,
                queries,
                testdb,
                redaUtils,
                debug,
                function(err,server){ //server init
                  
                  expect(err).to.be.null;
                  expect(server).to.not.be.undefined;

                  testdb.connect(function(dbConfigsErr){
                    expect(dbConfigsErr.message).to.not.be.null;
                    return server.close(done);
                  });
                });
  });

});

/**
 * these test start and stop the server for each it. They use 
 * Test routes (routes/api/Test/v0.js)
 * that do not use any library functions from db or 
 * queries (besides startup db calls, connect/close).
 * auth header checks could go here as they would not affect anything
 * beyond hitting the route with proper req properties
 * most of these routes simply send back req properties built by
 * middleware
 */
describe('ReDa REST Start/Stop Requests : ',function(){

  // fixtures
  var testsvr,  // holds reference to server
      configs = {
        //rlogs : 'console', //uncomment for console request logs
        test: true //routes for testing they know about the mocks!!
      },
      baseUrl = '/api/v0';

  beforeEach( 'Startup ReDa REST',function(done){

     var testdb = db({ db : 'info' });

     bootloader(configs,
                path,
                stream,
                zlib,
                async,
                express,
                expWinston,
                rotateTransport,
                bodyParser,
                csv,
                cuid,
                tar,
                auth,
                queries,
                testdb,
                redaUtils,
                debug, 
                function(err,server){ //server init

                  //if server startup fails -> fail tests 
                  expect(err).to.be.null;
                  expect(server).to.not.be.null;
                  testsvr = server; //pass server to suite ref
                  done();
                });
  });

  afterEach( 'Shutdown ReDa REST',function(done){
    expect(testsvr).to.not.be.undefined;
    testsvr.close(done);
  });

  it('Successful get request',function(done){

    expect(testsvr).to.not.be.undefined;

    request(testsvr)
      .get(baseUrl + '/test/get/success')
      .expect(200,done);

  });

  it('Successfully respond with the proper client err/code',function(done){

    expect(testsvr).to.not.be.undefined;

    request(testsvr)
      .get(baseUrl + '/test/get/error/400')
      .expect(400)
      .end(function(err,res){
        expect(err).to.be.null;
        expect(+res.body.code).to.equal(400);
        expect(res.body.message).to.not.be.null;
        done();
      });

  });

  it('Successfully respond with the proper server 500 err/code',function(done){

    expect(testsvr).to.not.be.undefined;

    request(testsvr)
      .get(baseUrl + '/test/get/error/500')
      .expect(500)
      .end(function(err,res){
        expect(err).to.be.null;
        expect(+res.body.code).to.equal(500);
        expect(res.body.message).to.not.be.null;
        expect(res.body.message).to.equal("Internal Server Error, See Docs about Bug Reporting");
        done();
      });

  });

  it('Successfully respond with the proper server 501 err/code',function(done){

    expect(testsvr).to.not.be.undefined;

    request(testsvr)
      .get(baseUrl + '/test/get/error/501')
      .expect(501)
      .end(function(err,res){
        expect(err).to.be.null;
        expect(+res.body.code).to.equal(501);
        expect(res.body.message).to.not.be.null;
        expect(res.body.message).to.equal("Unknown Error Occured, See Docs about Bug Reporting");
        done();
      });

  });

  it('Successfully respond with the when err has no status set',function(done){

    expect(testsvr).to.not.be.undefined;

    request(testsvr)
      .get(baseUrl + '/test/get/error/*')
      .expect(501)
      .end(function(err,res){
        expect(err).to.be.null;
        expect(+res.body.code).to.equal(501);
        expect(res.body.message).to.not.be.null;
        expect(res.body.message).to.equal("Unknown Error Occured, See Docs about Bug Reporting");
        done();
      });

  });

  //check proper json data parsed by bodyparser
  it('Successful JSON post request',function(done){

    expect(testsvr).to.not.be.undefined;

    var body = {'some':'proper json'};

    request(testsvr)
      .post(baseUrl + '/test/post')
      .send(body)
      .expect(200)
      .end(function(err,res){
        expect(err).to.be.null;
        expect(res.body.data).to.deep.equal(body);
        done();
      });

  });
  
  //check proper csv data parsed by bodyparser
  it('Successful csv post request',function(done){

    expect(testsvr).to.not.be.undefined;

    var body = 'C1,C2,C3\n' +
               'v11,v12,v13\n' +
               'v21,v22,v23\n';

    request(testsvr)
      .post(baseUrl + '/test/post/csv')
      .set('content-type','text/csv')
      .send(body)
      .expect(200)
      .end(function(err,res){
        expect(err).to.be.null;
        expect(res.body.data).to.equal(body);
        done();
      });

  });

  //check json data parsed by bodyparser
  it('Successfully handle bad json post req',function(done){

    expect(testsvr).to.not.be.undefined;

    request(testsvr)
      .post(baseUrl + '/test/post')
      .send(null)
      .expect(200)
      .end(function(err,res){
        expect(err).to.be.null;
        expect(res.body.data).to.be.empty;
        done();
      });

  });
  
  //check csv data parsed by bodyparser
  it('Successfully handle bad csv post req',function(done){

    expect(testsvr).to.not.be.undefined;

    request(testsvr)
      .post(baseUrl + '/test/post/csv')
      .set('content-type','text/csv')
      .send(';as""jf;aj\nf;""lsajf;\nsajf')
      .expect(200)
      .end(function(err,res){
        expect(err).to.be.null;
        expect(res.body.data).to.equal(';as""jf;aj\nf;""lsajf;\nsajf');
        done();
      });

  });

  //check general routes (currently the / route) are mounted
  //by default(not in requirements configs above)
  it('Successful default route(/) request',function(done){

    expect(testsvr).to.not.be.undefined;

    request(testsvr)
      .get(baseUrl + "/info")
      .expect(200,done);

  });
});

/**
 * these test use a continuous redarest server for each request 
 * It uses routes in the Test routes (routes/api/Test/v0.js)
 * These routes incorporate db mock and query lib calls
 */
describe('ReDa REST Continuous Requests : ',function(){

  // fixtures
  var testsvr,  // holds reference to server
      configs = {
        //rlogs : 'console', //uncomment for console request logs
        test: true //routes for testing they know about the mocks!!
      },
      baseUrl = '/api/v0';

  before( 'Startup ReDa REST',function(done){

     var testdb = db({ db : 'info' });
     bootloader(configs,
                path,
                stream,
                zlib,
                async,
                express,
                expWinston,
                rotateTransport,
                bodyParser,
                csv,
                cuid,
                tar,
                auth,
                queries,
                testdb,
                redaUtils,
                debug,
                function(err,server){ //server init

                  expect(err).to.be.null;
                  expect(server).to.not.be.null;
                  testsvr = server;
                  done();
                });
  });

  after( 'Shutdown ReDa REST',function(done){
    expect(testsvr).to.not.be.undefined;
    testsvr.close(done);
  });

  it('Successfully respond with the correct db read object',function(done){

    expect(testsvr).to.not.be.undefined;

    request(testsvr)
      .get(baseUrl + '/test/db/read')
      .expect(200)
      .end(function(err,res){
        expect(err).to.be.null;
        expect(+res.body.code).to.equal(200);
        expect(res.body.data[0]).to.deep.equal({
          Component: 'VenomApi',
          Process: 'create_network',
          Metric: 9.8
        });
        done();
      });

  });

  it('Successfully respond with the correct db write object',function(done){

    expect(testsvr).to.not.be.undefined;

    request(testsvr)
      .post(baseUrl + '/test/db/write')
      .expect(200)
      .end(function(err,res){
        expect(err).to.be.null;
        expect(+res.body.code).to.equal(200);
        expect(res.body.data).to.deep.equal({
          affectedRows: 7
        });
        done();
      });

  });

  it('Successfully handle db driver error',function(done){

    expect(testsvr).to.not.be.undefined;

    request(testsvr)
      .post(baseUrl + '/test/db/error')
      .expect(400)
      .end(function(err,res){
        expect(err).to.be.null;
        expect(+res.body.code).to.equal(400);
        expect(res.body.message).to.not.be.null;
        done();
      });

  });

  it('Successfully handle query lib error ',function(done){

    expect(testsvr).to.not.be.undefined;

    request(testsvr)
      .get(baseUrl + '/test/query/error')
      .expect(400)
      .end(function(err,res){
        expect(err).to.be.null;
        expect(+res.body.code).to.equal(400);
        expect(res.body.message).to.not.be.null;
        done();
      });

  });

}); //end continuous
