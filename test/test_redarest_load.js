// dev dependancies
var expect    = require("chai").expect,
    loadtest = require("loadtest"),
    cuid = require("cuid");

// this is inserted for run.runname, step.scriptname, and vp.name
// then used during get load tests to mak sure we are applying the same load each
// test run a better strategy would be to just start with a clean db but can't do that
// atm
var test_id = cuid();

// http:// is required

describe("ReDa REST Load Tests: POST: " + test_id, function(){
  describe("Insert Runs",function(){
    describe(BASE_URL, function(){

      var MAX_REQUESTS = 200,
          CONCURRENCY = 10,
          METHOD = "POST",
          ROUTE = "/run";

      it("Should "  + METHOD + " " + ROUTE + " " + MAX_REQUESTS + " times, " + CONCURRENCY + " at a time", function(done){

        this.timeout(0);

        var options = {
            url: BASE_URL + ROUTE,
            concurrency: CONCURRENCY,
            maxRequests: MAX_REQUESTS,
            method: METHOD,
            contentType: "application/json", // have to put content-type here won't work in headers opt.
            body: {
              "RunName" : test_id,
              "Testcase" : "Banquet-OG" 
            },
            statusCallback: function( statusErr, statusResult, statusLatency ){

              expect(statusErr).to.be.null;
              expect(statusLatency).to.not.be.null;
              expect(+statusResult.statusCode).to.equal(200);
            }
        };

        loadtest.loadTest(options, function( err, fullResult ){

          expect(err).to.be.null;
          expect(fullResult.totalRequests).to.equal(MAX_REQUESTS);
          expect(fullResult.totalErrors).to.equal(0);
          done();
        });
      });
    });
  });

  // If we insert a thounsand runs and nothing is deleted then step 1 and 10 must exist or someone is tampering with db
  describe("Insert Steps at RunId 1",function(){
    describe(BASE_URL, function(){

      var MAX_REQUESTS = 200,
          CONCURRENCY = 10,
          METHOD = "POST",
          ROUTE = "/run/1/step";

      it("Should "  + METHOD + " " + ROUTE + " " + MAX_REQUESTS + " times, " + CONCURRENCY + " at a time", function(done){

        this.timeout(0);

        var options = {
            url: BASE_URL + ROUTE,
            concurrency: CONCURRENCY,
            maxRequests: MAX_REQUESTS,
            method: METHOD,
            contentType: "application/json", // have to put content-type here won't work in headers opt.
            body: {
              "Testcase" : "Banquet-OG-1",
              "scriptname" : test_id 
            },
            statusCallback: function( statusErr, statusResult, statusLatency ){

              expect(statusErr).to.be.null;
              expect(statusLatency).to.not.be.null;
              expect(+statusResult.statusCode).to.equal(200);
            }
        };

        loadtest.loadTest(options, function( err, fullResult ){

          expect(err).to.be.null;
          expect(fullResult.totalRequests).to.equal(MAX_REQUESTS);
          expect(fullResult.totalErrors).to.equal(0);
          done();
        });
      });
    });
  });

  describe("Insert Steps at RunId 10",function(){
    describe(BASE_URL, function(){

      var MAX_REQUESTS = 200,
          CONCURRENCY = 10,
          METHOD = "POST",
          ROUTE = "/run/10/step";

      it("Should "  + METHOD + " " + ROUTE + " " + MAX_REQUESTS + " times, " + CONCURRENCY + " at a time", function(done){

        this.timeout(0);

        var options = {
            url: BASE_URL + ROUTE,
            concurrency: CONCURRENCY,
            maxRequests: MAX_REQUESTS,
            method: METHOD,
            contentType: "application/json", // have to put content-type here won't work in headers opt.
            body: {
              "Testcase" : "Banquet-OG-10",
              "scriptname" : test_id 
            },
            statusCallback: function( statusErr, statusResult, statusLatency ){

              expect(statusErr).to.be.null;
              expect(statusLatency).to.not.be.null;
              expect(+statusResult.statusCode).to.equal(200);
            }
        };

        loadtest.loadTest(options, function( err, fullResult ){

          expect(err).to.be.null;
          expect(fullResult.totalRequests).to.equal(MAX_REQUESTS);
          expect(fullResult.totalErrors).to.equal(0);
          done();
        });
      });
    });
  });

  // this needs to be formalized a bit but atm if we do 1 run insert and 2 
  // step inserts on that run we are guarnteed a 1-1,1-2 run step id pair
  // as long as no deletes happen...
  describe("Insert Verification Points at RunId/StepId 1/1",function(){
    describe(BASE_URL, function(){

      var MAX_REQUESTS = 500,
          CONCURRENCY = 20,
          METHOD = "POST",
          ROUTE = "/run/1/step/1/verificationPoint";

      it("Should "  + METHOD + " " + ROUTE + " " + MAX_REQUESTS + " times, " + CONCURRENCY + " at a time", function(done){

        this.timeout(0);

        var options = {
            url: BASE_URL + ROUTE,
            concurrency: CONCURRENCY,
            maxRequests: MAX_REQUESTS,
            method: METHOD,
            contentType: "application/json", // have to put content-type here won't work in headers opt.
            body: {
              "Name" : test_id,
              "Operator": "Is Hella Like",
              "Type": "Banquet-OG-1",
              "ExpectedValue": "Everything",
              "ResultValue": "Everything Else",
              "Result" : "pass" 
            },
            statusCallback: function( statusErr, statusResult, statusLatency ){

              expect(statusErr).to.be.null;
              expect(statusLatency).to.not.be.null;
              expect(+statusResult.statusCode).to.equal(200);
            }
        };

        loadtest.loadTest(options, function( err, fullResult ){

          expect(err).to.be.null;
          expect(fullResult.totalRequests).to.equal(MAX_REQUESTS);
          expect(fullResult.totalErrors).to.equal(0);
          done();
        });
      });
    });
  });

  describe("Insert Verification Points at RunId/StepId 10/2",function(){

    describe(BASE_URL, function(){

      var MAX_REQUESTS = 500,
          CONCURRENCY = 20,
          METHOD = "POST",
          ROUTE = "/run/10/step/2/verificationPoint";

      it("Should "  + METHOD + " " + ROUTE + " " + MAX_REQUESTS + " times, " + CONCURRENCY + " at a time", function(done){

        this.timeout(0);

        var options = {
            url: BASE_URL + ROUTE,
            concurrency: CONCURRENCY,
            maxRequests: MAX_REQUESTS,
            method: METHOD,
            contentType: "application/json", // have to put content-type here won't work in headers opt.
            body: {
              "Name" : test_id,
              "Operator": "Is Hella Like",
              "Type": "Banquet-OG-10",
              "ExpectedValue": "Everything",
              "ResultValue": "Everything Else",
              "Result" : "pass" 
            },
            statusCallback: function( statusErr, statusResult, statusLatency ){

              expect(statusErr).to.be.null;
              expect(statusLatency).to.not.be.null;
              expect(+statusResult.statusCode).to.equal(200);
            }
        };

        loadtest.loadTest(options, function( err, fullResult ){

          expect(err).to.be.null;
          expect(fullResult.totalRequests).to.equal(MAX_REQUESTS);
          expect(fullResult.totalErrors).to.equal(0);
          done();
        });
      });
    });
  });
});

describe("ReDa REST Load Tests GET: " + test_id, function(){
  describe("GET Runs:", function(){
    describe(BASE_URL, function(){

      var MAX_REQUESTS = 200,
          CONCURRENCY = 20,
          METHOD = "GET",
          ROUTE = "/runs?RunName=" + test_id;

      it("Should "  + METHOD + " " + ROUTE + " " + MAX_REQUESTS + " times, " + CONCURRENCY + " at a time", function(done){
      
        this.timeout(0);

        var options = {
            url: BASE_URL + ROUTE,
            concurrency: CONCURRENCY,
            maxRequests: MAX_REQUESTS,
            method: METHOD,
            statusCallback: function( statusErr, statusResult, statusLatency ){

              expect(statusErr).to.be.null;
              expect(statusLatency).to.not.be.null;
              expect(+statusResult.statusCode).to.equal(200);
            }
        };

        loadtest.loadTest(options, function( err, fullResult ){

          expect(err).to.be.null;
          expect(fullResult.totalRequests).to.equal(MAX_REQUESTS);
          expect(fullResult.totalErrors).to.equal(0);
          done();
        });
      });
    });
  }); // end GET Runs

  describe("GET Steps:", function(){
    describe(BASE_URL, function(){

      var MAX_REQUESTS = 200,
          CONCURRENCY = 20,
          METHOD = "GET",
          ROUTE = "/steps?scriptname=" + test_id + "&testcase=Banquet-OG-1";

      it("Should "  + METHOD + " " + ROUTE + " " + MAX_REQUESTS + " times, " + CONCURRENCY + " at a time", function(done){

        this.timeout(0);

        var options = {
            url: BASE_URL + ROUTE,
            concurrency: CONCURRENCY,
            maxRequests: MAX_REQUESTS,
            method: METHOD,
            statusCallback: function( statusErr, statusResult, statusLatency ){

              expect(statusErr).to.be.null;
              expect(statusLatency).to.not.be.null;
              expect(+statusResult.statusCode).to.equal(200);
            }
        };

        loadtest.loadTest(options, function( err, fullResult ){

          expect(err).to.be.null;
          expect(fullResult.totalRequests).to.equal(MAX_REQUESTS);
          expect(fullResult.totalErrors).to.equal(0);
          done();
        });
      });

      var MAX_REQUESTS = 200,
          CONCURRENCY = 20,
          METHOD = "GET",
          ROUTE = "/steps?scriptname=" + test_id + "&testcase=Banquet-OG-10";

      it("Should "  + METHOD + " " + ROUTE + " " + MAX_REQUESTS + " times, " + CONCURRENCY + " at a time", function(done){

        this.timeout(0);

        var options = {
            url: BASE_URL + ROUTE,
            concurrency: CONCURRENCY,
            maxRequests: MAX_REQUESTS,
            method: METHOD,
            statusCallback: function( statusErr, statusResult, statusLatency ){

              expect(statusErr).to.be.null;
              expect(statusLatency).to.not.be.null;
              expect(+statusResult.statusCode).to.equal(200);
            }
        };

        loadtest.loadTest(options, function( err, fullResult ){

          expect(err).to.be.null;
          expect(fullResult.totalRequests).to.equal(MAX_REQUESTS);
          expect(fullResult.totalErrors).to.equal(0);
          done();
        });
      });
    });
  }); // end GET Steps

  describe("GET Verification Points:", function(){
    describe(BASE_URL, function(){

      var MAX_REQUESTS = 200,
          CONCURRENCY = 20,
          METHOD = "GET",
          ROUTE = "/verificationPoints?name=" + test_id + "&type=Banquet-OG-1";

      it("Should "  + METHOD + " " + ROUTE + " " + MAX_REQUESTS + " times, " + CONCURRENCY + " at a time", function(done){

        this.timeout(0);

        var options = {
            url: BASE_URL + ROUTE,
            concurrency: CONCURRENCY,
            maxRequests: MAX_REQUESTS,
            method: METHOD,
            statusCallback: function( statusErr, statusResult, statusLatency ){

              expect(statusErr).to.be.null;
              expect(statusLatency).to.not.be.null;
              expect(+statusResult.statusCode).to.equal(200);
            }
        };

        loadtest.loadTest(options, function( err, fullResult ){

          expect(err).to.be.null;
          expect(fullResult.totalRequests).to.equal(MAX_REQUESTS);
          expect(fullResult.totalErrors).to.equal(0);
          done();
        });
      });

      var MAX_REQUESTS = 200,
          CONCURRENCY = 20,
          METHOD = "GET",
          ROUTE = "/verificationPoints?name=" + test_id + "&type=Banquet-OG-10";

      it("Should "  + METHOD + " " + ROUTE + " " + MAX_REQUESTS + " times, " + CONCURRENCY + " at a time", function(done){

        this.timeout(0);

        var options = {
            url: BASE_URL + ROUTE,
            concurrency: CONCURRENCY,
            maxRequests: MAX_REQUESTS,
            method: METHOD,
            statusCallback: function( statusErr, statusResult, statusLatency ){

              expect(statusErr).to.be.null;
              expect(statusLatency).to.not.be.null;
              expect(+statusResult.statusCode).to.equal(200);
            }
        };

        loadtest.loadTest(options, function( err, fullResult ){

          expect(err).to.be.null;
          expect(fullResult.totalRequests).to.equal(MAX_REQUESTS);
          expect(fullResult.totalErrors).to.equal(0);
          done();
        });
      });
    });
  }); // end GET verificationPoints

  // broked atm
  describe.skip("GET Search Routes:", function(){
    describe(BASE_URL, function(){

      var MAX_REQUESTS = 200,
          CONCURRENCY = 20,
          METHOD = "GET",
          ROUTE = 'search/VerificationPoints?query={"runs":[["runname","LIKE","' + test_id + '","OR"]],"steps":[["scriptname","LIKE","'+test_id+'","AND],["testcase","=","Banquet-OG-1","OR"]]}';

      it("Should "  + METHOD + " " + ROUTE + " " + MAX_REQUESTS + " times, " + CONCURRENCY + " at a time", function(done){

        this.timeout(0);

        var options = {
            url: BASE_URL + ROUTE,
            concurrency: CONCURRENCY,
            maxRequests: MAX_REQUESTS,
            method: METHOD,
            statusCallback: function( statusErr, statusResult, statusLatency ){

              expect(statusErr).to.be.null;
              expect(statusLatency).to.not.be.null;
              expect(+statusResult.statusCode).to.equal(200);
            }
        };

        loadtest.loadTest(options, function( err, fullResult ){

          expect(err).to.be.null;
          expect(fullResult.totalRequests).to.equal(MAX_REQUESTS);
          expect(fullResult.totalErrors).to.equal(0);
          done();
        });
      });

      var MAX_REQUESTS = 200,
          CONCURRENCY = 20,
          METHOD = "GET",
          ROUTE = 'search/VerificationPoints?query={"runs":[["runname","LIKE","' + test_id + '","OR"]],"steps":[["scriptname","LIKE","'+test_id+'","AND],["testcase","=","Banquet-OG-10","OR"]]}';

      it("Should "  + METHOD + " " + ROUTE + " " + MAX_REQUESTS + " times, " + CONCURRENCY + " at a time", function(done){

        this.timeout(0);

        var options = {
            url: BASE_URL + ROUTE,
            concurrency: CONCURRENCY,
            maxRequests: MAX_REQUESTS,
            method: METHOD,
            statusCallback: function( statusErr, statusResult, statusLatency ){

              expect(statusErr).to.be.null;
              expect(statusLatency).to.not.be.null;
              expect(+statusResult.statusCode).to.equal(200);
            }
        };

        loadtest.loadTest(options, function( err, fullResult ){

          expect(err).to.be.null;
          expect(fullResult.totalRequests).to.equal(MAX_REQUESTS);
          expect(fullResult.totalErrors).to.equal(0);
          done();
        });
      });
    });
  }); // end GET verificationPoints 
}); //end load tests Get
