// dependancies
var _   = require('underscore'),
    mysql = require('mysql'),
    async = require('async'),
    dateformat = require('dateformat'),
    debug = require('debug');

// dev dependancies
var expect = require("chai").expect;

//lib stuff
var queries   = require('../lib/queries')( _, dateformat, debug );

var schema = require('../schemas/ab/schema.json');

var db = require('../lib/db-driver')(schema, mysql, async, _, debug);

db.execute = function(queryStr, cb){
  return cb(null, queryStr);
};

describe('Query Building Tests : ',function(){

  /*describe('search',function(){

    it('should create a basic search resource query',function(done){

      var query = {};
      queries.search("UnknownTable", query, function(err, qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("SELECT * FROM `UnknownTable` ORDER BY `id` ASC");
      });

      done();
    });

    it('should create a basic search runs query',function(done){

      var query = {};
      queries.search("Runs", query, function(err, qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("SELECT * FROM `GroupInfo` ORDER BY `grpid` ASC");
      });

      done();
    });

    it('should create a basic search runs query with select attrs',function(done){

      var query = {
        select: ["RUNNAME"]
      };
      queries.search("Runs", query, function(err, qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("SELECT `groupname` FROM (SELECT * FROM `GroupInfo` ORDER BY `grpid` ASC) AS T");
      });

      done();
    });

    it('should create a basic search runs query with distinct attrs and not select attrs',function(done){

      var query = {
        select: ["RUNNAME"],
        distinct: "RUNNAME"
      };
      queries.search("Runs", query, function(err, qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("SELECT DISTINCT `groupname` FROM (SELECT * FROM `GroupInfo` ORDER BY `grpid` ASC) AS T");
      });

      done();
    });

    it('should create a search versioninfo query with desc order',function(done){

      var query = {
          order: "desc"
      };
      queries.search("VersionInfo", query, function(err, qStr){
        expect(err).to.be.null;
      });

      done();
    });

    it('should create a search runs query',function(done){

      var query = {
          runs: [["stationtype","LIKE","VLAB","AND"],["TestCase","=","Wait_1s","OR"]]
      };
      queries.search("Runs", query, function(err, qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("SELECT * FROM `GroupInfo` WHERE ( `stationtype` LIKE \"VLAB\" AND `testcase` = \"Wait_1s\" ) ORDER BY `grpid` ASC");
      });

      done();
    });

    it('should create a search steps query with default order',function(done){

      var query = {
          steps: [["scriptname","=","Wait.tcl","OR"]],
          order: "blah"
      };
      queries.search("Steps", query, function(err, qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("SELECT * FROM `TestInfo` WHERE ( `scriptname` = \"Wait.tcl\" ) ORDER BY `grpid`,`testid` ASC");
      });

      done();
    });

    it('should create a search vps with runs and steps filter',function(done){

      var query = {
          runs: [["stationtype","LIKE","VLAB","AND"],["TestCase","=","Wait_1s","OR"]],
          steps: [["scriptname","=","Wait.tcl","AND"],["durationhrs",">",0.2,"OR"]],
          vps: [["result","=","FAIL","AND"]]
      };
      queries.search("VerificationPoints", query, function(err, qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("SELECT * FROM `VerificationPoints` WHERE ( `result` = \"FAIL\" ) AND " +
                              "`grpid` IN ( SELECT `grpid` FROM `GroupInfo` WHERE `stationtype` LIKE \"VLAB\" AND `testcase` = \"Wait_1s\" ) AND " +
                              "(`grpid`,`testid`) IN ( SELECT `grpid`,`testid` FROM `TestInfo` WHERE `scriptname` = \"Wait.tcl\" AND `durationhrs` > 0.2 ) " +
                              "ORDER BY `id` ASC");
      });

      done();
    });

    it('should create a search runs query vps filter',function(done){

      var query = {
          vps: [["result","=","FAIL","AND"]]
      };

      queries.search("Runs", query, function(err, qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("SELECT * FROM `GroupInfo` WHERE `grpid` IN ( SELECT `grpid` FROM `VerificationPoints` WHERE `result` = \"FAIL\" ) ORDER BY `grpid` ASC");
      });

      done();
    });

    it('should create a search runs query vps filter and distinct attrs',function(done){

      var query = {
          distinct: "runName",
          vps: [["result","=","FAIL","AND"]],
          order: "ASC"
      };

      queries.search("Runs", query, function(err, qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("SELECT DISTINCT `groupname` FROM (SELECT * FROM `GroupInfo` WHERE `grpid` IN ( SELECT `grpid` FROM `VerificationPoints` WHERE `result` = \"FAIL\" ) ORDER BY `grpid` ASC) AS T");
      });

      done();
    });

    it('should create a search steps query with runs and vps filter',function(done){

      var query = {
          runs: [["stationtype","LIKE","VLAB","AND"],["TestCase","=","Wait_1s","OR"]],
          steps: [["scriptname","=","Wait.tcl","AND"],["durationhrs",">",0.2,"OR"]],
          vps: [["result","=","FAIL","AND"]]
      };
      queries.search("Steps", query, function(err, qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("SELECT * FROM `TestInfo` WHERE ( `scriptname` = \"Wait.tcl\" AND `durationhrs` > 0.2 ) AND " +
                              "`grpid` IN ( SELECT `grpid` FROM `GroupInfo` WHERE `stationtype` LIKE \"VLAB\" AND `testcase` = \"Wait_1s\" ) AND " +
                              "(`grpid`,`testid`) IN ( SELECT `grpid`,`testid` FROM `VerificationPoints` WHERE `result` = \"FAIL\" ) ORDER BY `grpid`,`testid` ASC");
      });

      done();
    });

    it('should create a search steps query with runs and vps filter and select attributes',function(done){

      var query = {
          select: ["scriptNAME"],
          runs: [["stationtype","LIKE","VLAB","AND"],["TestCase","=","Wait_1s","OR"]],
          steps: [["scriptname","=","Wait.tcl","AND"],["durationhrs",">",0.2,"OR"]],
          vps: [["result","=","FAIL","AND"]]
      };
      queries.search("Steps", query, function(err, qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("SELECT `scriptname` FROM (SELECT * FROM `TestInfo` WHERE ( `scriptname` = \"Wait.tcl\" AND `durationhrs` > 0.2 ) AND " +
                              "`grpid` IN ( SELECT `grpid` FROM `GroupInfo` WHERE `stationtype` LIKE \"VLAB\" AND `testcase` = \"Wait_1s\" ) AND " +
                              "(`grpid`,`testid`) IN ( SELECT `grpid`,`testid` FROM `VerificationPoints` WHERE `result` = \"FAIL\" ) ORDER BY `grpid`,`testid` ASC) AS T");
      });

      done();
    });

    it('should create a search runs query with runs, steps, vers, and vps filter',function(done){

      var query = {
          runs:  [["stationtype","LIKE","VLAB","AND"],["TestCase","=","Wait_1s","OR"]],
          steps: [["stepID","<",4,"AND"],["durationhrs",">",0.2,"OR"]],
          vps:   [["result","=","FAIL","AND"]],
      };
      queries.search("Runs", query, function(err, qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("SELECT * FROM `GroupInfo` WHERE ( `stationtype` LIKE \"VLAB\" AND `testcase` = \"Wait_1s\" ) AND " +
                              "`grpid` IN ( SELECT `grpid` FROM `TestInfo` WHERE `testid` < 4 AND `durationhrs` > 0.2 ) AND " +
                              "`grpid` IN ( SELECT `grpid` FROM `VerificationPoints` WHERE `result` = \"FAIL\" ) AND " +
      });

      done();
    });

    it('should create a search runs query with runs, steps, vers, and vps filter with distinct attrs',function(done){

      var query = {
          distinct: ["stationtype","RESULT"],
          runs:  [["stationtype","LIKE","VLAB","AND"],["TestCase","=","Wait_1s","OR"]],
          steps: [["stepID","<",4,"AND"],["durationhrs",">",0.2,"OR"]],
          vps:   [["result","=","FAIL","AND"]],
      };
      queries.search("Runs", query, function(err, qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("SELECT DISTINCT `stationtype`,`specpassfail` FROM (SELECT * FROM `GroupInfo` WHERE ( `stationtype` LIKE \"VLAB\" AND `testcase` = \"Wait_1s\" ) AND " +
                              "`grpid` IN ( SELECT `grpid` FROM `TestInfo` WHERE `testid` < 4 AND `durationhrs` > 0.2 ) AND " +
                              "`grpid` IN ( SELECT `grpid` FROM `VerificationPoints` WHERE `result` = \"FAIL\" ) AND " +
      });

      done();
    });

    it('should create a search rps query with only the rps and runs filter with distinct attrs',function(done){

      var query = {
          distinct: ["plan"],
          runs:  [["stationtype","LIKE","VLAB","AND"],["TestCase","=","Wait_1s","OR"]],
          steps: [["stepID","<",4,"AND"],["durationhrs",">",0.2,"OR"]],
          vps:   [["result","=","FAIL","AND"]],
          rps:  [["description","IS NOT",null,"OR"]]
      };
      queries.search("RunPlans", query, function(err, qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("SELECT DISTINCT `plan` FROM (SELECT * FROM `RunPlans` WHERE ( `description` IS NOT null ) AND " +
                              "`testcase` IN ( SELECT `testcase` FROM `GroupInfo` WHERE `stationtype` LIKE \"VLAB\" AND `testcase` = \"Wait_1s\" ) " +  
                              "ORDER BY `planid` ASC) AS T" );
      });

      done();
    });

    it('should create a search sps query with only the rps and steps filter with distinct attrs',function(done){

      var query = {
          distinct: ["plan"],
          runs:  [["stationtype","LIKE","VLAB","AND"],["TestCase","=","Wait_1s","OR"]],
          steps: [["stepID","<",4,"AND"],["durationhrs",">",0.2,"OR"]],
          vps:   [["result","=","FAIL","AND"]],
          rps:  [["TestCase","LIKE","PAT","OR"]],
          sps:  [["Scriptname","LIKE","IxLoadTest.tcl","OR"]]
      };
      queries.search("StepPlans", query, function(err, qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("SELECT DISTINCT `plan` FROM (SELECT * FROM `StepPlans` WHERE ( `scriptname` LIKE \"IxLoadTest.tcl\" ) AND " + 
                              "`plan` IN ( SELECT `plan` FROM `RunPlans` WHERE `testcase` LIKE \"PAT\" ) AND " +
                              "`scriptname` IN ( SELECT `scriptname` FROM `TestInfo` WHERE `testid` < 4 AND `durationhrs` > 0.2 ) " +
                              "ORDER BY `planid` ASC) AS T" );
      });
      done();
    });
    it('should create a search spl query with only the sps filter with distinct attrs',function(done){

      var query = {
          distinct: ["linkurl"],
          runs:  [["stationtype","LIKE","VLAB","AND"],["TestCase","=","Wait_1s","OR"]],
          steps: [["stepID","<",4,"AND"],["durationhrs",">",0.2,"OR"]],
          vps:   [["result","=","FAIL","AND"]],
          rps:  [["TestCase","LIKE","PAT","OR"]],
          sps:  [["Scriptname","LIKE","IxLoadTest.tcl","OR"]],
          spl:  [["Link","LIKE","super link","OR"]]
      };
      queries.search("StepPlanLinks", query, function(err, qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("SELECT DISTINCT `linkurl` FROM (SELECT * FROM `StepPlanLinks` WHERE ( `link` LIKE \"super link\" ) AND " + 
                              "`stepplanid` IN ( SELECT `planid` FROM `StepPlans` WHERE `scriptname` LIKE \"IxLoadTest.tcl\" ) " +
                              "ORDER BY `linkid` ASC) AS T" );
      });

      done();
    });

    it('should create a search Runs query with basic grouping',function(done){

      var query = {
          distinct: ["testcase"],
          runs:  [["stationtype","LIKE","VLAB","AND",1],["TestCase","=","Wait_1s","OR",1]],
      };

      queries.search("Runs", query, function(err, qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("SELECT DISTINCT `testcase` FROM (SELECT * FROM `GroupInfo` WHERE ( (`stationtype` LIKE \"VLAB\" AND " +
                              "`testcase` = \"Wait_1s\") ) ORDER BY `grpid` ASC) AS T" );
      });

      done();
    });

    it('should create a search Runs query with grouping and 1 filter array',function(done){

      var query = {
          distinct: ["testcase"],
          runs:  [["stationtype","LIKE","VLAB","AND",1]],
      };

      queries.search("Runs", query, function(err, qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("SELECT DISTINCT `testcase` FROM (SELECT * FROM `GroupInfo` WHERE ( (`stationtype` LIKE \"VLAB\") ) ORDER BY `grpid` ASC) AS T" );
      });

      done();
    });

    it('should create a search Runs query with incomplete grouping',function(done){

      var query = {
          distinct: ["testcase"],
          runs:  [["stationtype","LIKE","VLAB","AND",1],["TestCase","=","Wait_1s","OR"]],
      };

      queries.search("Runs", query, function(err, qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("SELECT DISTINCT `testcase` FROM (SELECT * FROM `GroupInfo` WHERE ( (`stationtype` LIKE \"VLAB\" AND " +
                              "`testcase` = \"Wait_1s\") ) ORDER BY `grpid` ASC) AS T" );
      });

      done();
    });

    it('should create a search Runs query with broader grouping',function(done){

      var query = {
          distinct: ["testcase"],
          runs:  [["stationtype","LIKE","VLAB","AND",1],["TestCase","=","Wait_1s","OR"],["runname","=","blah","OR",1]],
      };

      queries.search("Runs", query, function(err, qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("SELECT DISTINCT `testcase` FROM (SELECT * FROM `GroupInfo` WHERE ( (`stationtype` LIKE \"VLAB\" AND " +
                              "`testcase` = \"Wait_1s\" OR `groupname` = \"blah\") ) ORDER BY `grpid` ASC) AS T" );
      });

      done();
    });

    it('should create a search Runs query with broader incomplete grouping',function(done){

      var query = {
          distinct: ["testcase"],
          runs:  [["stationtype","LIKE","VLAB","AND",1],["TestCase","=","Wait_1s","OR"],["runname","=","blah","OR"]],
      };

      queries.search("Runs", query, function(err, qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("SELECT DISTINCT `testcase` FROM (SELECT * FROM `GroupInfo` WHERE ( (`stationtype` LIKE \"VLAB\" AND " +
                              "`testcase` = \"Wait_1s\" OR `groupname` = \"blah\") ) ORDER BY `grpid` ASC) AS T" );
      });

      done();
    });

    it('should create a search Runs query with 2 different groupings 1 final is incomplete',function(done){

      var query = {
          distinct: ["testcase"],
          runs:  [["stationtype","LIKE","VLAB","OR",1],["runname","LIKE","Bro","OR"],["TestCase","=","Wait_1s","AND",1],
                  ["stationtype","LIKE","CLAB","OR",1],["TestCase","=","Bruh_1s","AND"]],
      };

      queries.search("Runs", query, function(err, qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("SELECT DISTINCT `testcase` FROM (SELECT * FROM `GroupInfo` WHERE ( (`stationtype` LIKE \"VLAB\" OR " +
                              "`groupname` LIKE \"Bro\" OR `testcase` = \"Wait_1s\") AND " +
                              "(`stationtype` LIKE \"CLAB\" OR `testcase` = \"Bruh_1s\") ) ORDER BY `grpid` ASC) AS T" );
      });

      done();
    });

    it('should create a search Runs query with broader grouping',function(done){

        var query = {
            distinct: ["testcase"],
            runs:  [["stationtype","LIKE","VLAB","OR",1],["TestCase","=","Wait_1s","AND",1],
                    ["stationtype","LIKE","CLAB","OR",1],["TestCase","=","Bruh_1s","AND",1]],
        };

        queries.search("Runs", query, function(err, qStr){
          expect(err).to.be.null;
          expect(qStr).to.equal("SELECT DISTINCT `testcase` FROM (SELECT * FROM `GroupInfo` WHERE ( (`stationtype` LIKE \"VLAB\" OR " +
                                "`testcase` = \"Wait_1s\") AND (`stationtype` LIKE \"CLAB\" OR `testcase` = \"Bruh_1s\") ) ORDER BY `grpid` ASC) AS T" );
        });

        done();
      });

    it('should create a search steps query with runs and vps filter and select attributes containing groupings',function(done){

      var query = {
          select: ["scriptNAME"],
          runs: [["stationtype","LIKE","VLAB","AND"],["TestCase","=","Wait_1s","OR",1],["runname","=","bruh","AND",1]],
          steps: [["scriptname","=","Wait.tcl","AND",1],["durationhrs",">",0.2,"OR",1],["TestCase","LIKE","bruv","AND"]],
          vps: [["result","=","FAIL","AND"]]
      };
      queries.search("Steps", query, function(err, qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("SELECT `scriptname` FROM (SELECT * FROM `TestInfo` WHERE ( (`scriptname` = \"Wait.tcl\" AND `durationhrs` > 0.2) OR `testcase` LIKE \"bruv\" ) AND " +
                              "`grpid` IN ( SELECT `grpid` FROM `GroupInfo` WHERE `stationtype` LIKE \"VLAB\" AND (`testcase` = \"Wait_1s\" OR `groupname` = \"bruh\") ) AND " +
                              "(`grpid`,`testid`) IN ( SELECT `grpid`,`testid` FROM `VerificationPoints` WHERE `result` = \"FAIL\" ) ORDER BY `grpid`,`testid` ASC) AS T");
      });

      done();
    });

  }); // end search
  */
  /*describe('getMetrics',function(){

    it('should create a get query with required Component and Process parameters',function(done){

      var where = {
           'Component':'VenomApi',
           'Process' : 'create_network'
          };

      queries.getMetrics(where,function(err,qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("SELECT * FROM `Metrics` WHERE `component` = \"VenomApi\" AND `process` = \"create_network\"");
        done();
      }); 
    });

    it('should create a get query with where required ID parameter',function(done){

      var where = {
           'runID': 123
          };

      queries.getMetrics(where,function(err,qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("SELECT * FROM `Metrics` WHERE `grpid` = 123");
        done();
      }); 
    });

    it('should error given an empty where parameter',function(done){

      var where = {}; // will be empty if no query is provided

      queries.getMetrics( where, function(err,qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
        done();
      }); 
    });

    it('should error if no required params are provided',function(done){

      var where = {"Context1": "Hey There", "Process":"create_network"}; // will be empty if no query str is passed to express 

      queries.getMetrics( where, function(err,qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
        done();
      }); 
    });

  });*/ //end getMetrics

  /*describe('insertMetric',function(){

    it('should create a create an insert query with set parameters',function(done){

      var set = {
           'Component':'VenomApi',
           'Process' : 'create_network',
           'Type' : 'elapsed_time',
           'Metric' : 7.8,
           'timestamp' :'2017-03-29 22:59:27'
          };

      queries.insertMetric( set, function(err,qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("INSERT INTO `Metrics` SET `component` = \"VenomApi\", `process` = \"create_network\", `type` = \"elapsed_time\", `metric` = 7.8, `timestamp` = \"2017-03-29 22:59:27\"");
      });

      set = {
           'Component':'VenomApi',
           'Process' : 'create_network',
           'Type' : 'elapsed_time',
           'Metric' : 7.8
          };

      queries.insertMetric( set, function(err,qStr){
        expect(err).to.be.null;
        expect(qStr).to.match(/`timestamp`/);
      });

      done();
    });

    it('should error if set paramerters are empty',function(done){

      var set = {};

      queries.insertMetric(set,function(err,qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
        done();
      }); 
    });

    it('should error if missing a required parameter Component, Process, Type, Metric',function(done){

      var set = {
           'Component':'VenomApi',
           'Process' : 'create_network'
          };

      queries.insertMetric(set,function(err,qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
        done();
      }); 
    });

    it('should error if no set parameters are provided',function(done){

      var set = null;

      queries.insertMetric(set,function(err,qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
        done();
      }); 
    });

  });*/ //end insertMetric 

  /*describe('deleteMetrics',function(){

    it('should create a delete query with where parameters',function(done){

      var where = {
            'runid' : 89
          };

      queries.deleteMetrics( where, function(err, qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("DELETE FROM `Metrics` WHERE `grpid` = 89");
        done();
      }); 
    });

    it('should error if required param Component and Process or ID is missing', function(done){

      var where = {
            'Context1' : 'Hey' 
          };

      queries.deleteMetrics( where, function(err, qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
        done();
      });
    });

    it('should error if no where parameters are provided',function(done){

      var where = null;

      queries.deleteMetrics( where, function(err, qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
        done();
      }); 
    });
  });*/ //end deleteMetrics

  /*describe('insertVerificationPoint',function(){

    it('should create a VerificationPoints insert query with set parameters from old route (Deprecated)',function(done){

      var set = {
           'Name' : 'Best Verification Point',
           'Result' : 'pass',
           'datetime' : '2017-03-30 00:25:46',
           'RunID' : 3456,
           'StepID' : 1
          };

      queries.insertVerificationPoint(set,null,function(err,qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("INSERT INTO `VerificationPoints` SET `name` = \"Best Verification Point\", `result` = \"pass\", `datetime` = \"2017-03-30 00:25:46\", `grpid` = 3456, `testid` = 1");
      });

      set = {
           'Name' : "Best Verification",
           'Result' : 'pass',
           'datetime' : '2017-03-30 00:25:46',
           'GrpId' : 3456,
           'TestId' : 0 
          };

      queries.insertVerificationPoint(set,null,function(err,qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("INSERT INTO `VerificationPoints` SET `name` = \"Best Verification\", `result` = \"pass\", `datetime` = \"2017-03-30 00:25:46\", `grpid` = 3456, `testid` = 0");
      });

      done();
    });

    it('should create a VerificationPoints insert query with set parameters',function(done){

      var set = {
           'Name' : 'Best Verification Point',
           'Result' : 'pass',
           'datetime' : '2017-03-30 00:25:46'
          },
          params = {
           'RunID' : 3456,
           'StepID' : 1
          };

      queries.insertVerificationPoint(set,params,function(err,qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("INSERT INTO `VerificationPoints` SET `name` = \"Best Verification Point\", `result` = \"pass\", `datetime` = \"2017-03-30 00:25:46\", `grpid` = 3456, `testid` = 1");
      });

      set = {
           'Name' : 'Best Verification Point',
           'Result' : 'pass'
          },
          params = {
           'RunID' : 3456,
           'StepID' : 1
          };

      queries.insertVerificationPoint(set,params,function(err,qStr){
        expect(err).to.be.null;
        expect(qStr).to.match(/`datetime`/);
      });
 
      done();
    });

    it('should error if required fields are missing',function(done){

      var set = {
           'GrpID' : 3456,
           'TestID' : 1,
           'Name' : 'Best Verification Point'
          },
          params = {};

      queries.insertVerificationPoint(set, params, function(err,qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
        done();
      }); 
    });

    it('should error if set paramerters are empty',function(done){

      var set = {}, params = null;

      queries.insertVerificationPoint(set, params, function(err,qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
        done();
      }); 
    });

    it('should error if no set parameters are provided',function(done){

      var set = null, params = {};

      queries.insertVerificationPoint(set, params, function(err,qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
        done();
      });
    });

  });*/ //end insertVerificationPoint 

  describe('getRuns',function(){

    it('should create a Test Runs get query',function(done){
   
      var where = {
           "query" : {
             'RunID' : 3456,
             'Datetime' : '2017-03-29 10:00:00'
            }
          };

      db.get('Runs',where, function(err,qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("SELECT `GrpID AS `RunID`  FROM `GroupInfo` WHERE `grpid` = 3456 AND `datetime` = \"2017-03-29 10:00:00\"");
      });

      var where = {
           'TestCASE' : 'emaNnoitatS',
           'DATETIME' : '2017-03-29 10:00:00'
          };

      queries.getRuns(where, function(err,qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("SELECT * FROM `GroupInfo` WHERE `testcase` = \"emaNnoitatS\" AND `datetime` = \"2017-03-29 10:00:00\"");
      });

      var where = {
           'RUNname' : 'emaNnoitatS',
           'DATETIME' : '2017-03-29 10:00:00'
          };

      queries.getRuns(where, function(err,qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("SELECT * FROM `GroupInfo` WHERE `groupname` = \"emaNnoitatS\" AND `datetime` = \"2017-03-29 10:00:00\"");
      });

      done();
    });

    it('should error if a required param is not provided',function(done){

      var where = {
           'TestID' : 3456
          };

      queries.getRuns(where, function(err,qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
      });

      done();
    });

  });// end getRuns

  /*describe('insertRun',function(){

    it('should create a Test Runs insert query with required parameters in objects',function(done){

      var set = {
           'User' : 'user',
           'TestCASE': 'Brotest',
           'DateTIME': '2017-03-29 10:00:00',
           'testexecserver' : 'sam01-prod-ab',
           'Result' : 'pass'
          };

      queries.insertRun(set,function(err,qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("INSERT INTO `GroupInfo` SET `user` = \"user\", `testcase` = \"Brotest\", `datetime` = \"2017-03-29 10:00:00\", `samstation` = \"sam01-prod-ab\", `specpassfail` = \"pass\"");
      });

      set = {
           'User' : 'Such an amazing run...',
           'TESTCASE': 'Brostation'
          };

      queries.insertRun(set,function(err,qStr){
        expect(err).to.be.null;
        expect(qStr).to.match(/`datetime`/);
      });

      done();
    });

    it('should create a Test Runs insert query with required parameters in paired arrays',function(done){

      var set = [ 
           'User',
           'Testcase',
           'DateTIME',
           'Result'
          ],
          values = [
           "user \"escape double\"", 
           "Brotest 'single quotes'",
           '2017-03-29 10:00:00',
           'pass'
          ];

      queries.insertRun(set, values, function(err,qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("INSERT INTO `GroupInfo` SET `user` = \"user 'escape double'\", `testcase` = \"Brotest 'single quotes'\", `datetime` = \"2017-03-29 10:00:00\", `specpassfail` = \"pass\"");
      });

      set = [
           'user',
           'TESTCASE'
      ],
      values = [ 
           'Such an amazing run...', 
           'Brostation'
      ];

      queries.insertRun(set, values, function(err,qStr){
        expect(err).to.be.null;
        expect(qStr).to.match(/`datetime`/); // check auto_generation
      });

      done();
    });

    it('should error if a required param is not provided',function(done){

      var set = {
           'TestID' : 3456
          };

      queries.insertRun(set, function(err,qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
      });

      done();
    });

    it('should error if a primary key is provided in set clause',function(done){

      var set = {
           'GrpId' : 3456 //never allowed
          };

      queries.insertRun(set, function(err,qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
      });

      set = {
           'RunId' : 3456
          };

      queries.insertRun(set, function(err,qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
      });

      done();
    });
  });// end insertRun

  describe('updateRun',function(){

    it('should create a Run insert queries with required parameters',function(done){

      var set = {
            "Status" : "running"
          },
          where = {
            "RunId" : 7
          };

      queries.updateRun(set, where, function(err,qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("UPDATE `GroupInfo` SET `status` = \"running\" WHERE `grpid` = 7");
      });

      var set = {
            "Status" : "running" 
          },
          where = {
            "RUNID" : 7
          };

      queries.updateRun(set, where, function(err,qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("UPDATE `GroupInfo` SET `status` = \"running\" WHERE `grpid` = 7");
      });

      done();
    });

    it('should error if a required where/set param is not provided',function(done){

      var set = {
           'TestID' : 3456
          },
          where = null;

      queries.updateRun(set, where, function(err,qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
      });

      set = null,
      where = {
            "RunId" : 7
          };

      queries.updateRun(set, where, function(err,qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
      });

      done();
    });

    it('should error if a primary key is provided in set clause',function(done){

      var set = {
           'GrpId' : 3456 //bad
          },
          where = {
           'RunId' : 3456 //ok
          };

      queries.updateRun(set, where, function(err,qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
      });

      set = {
           'RunId' : 3456
          },
      where = {
           'RunId' : 777
         };

      queries.updateRun(set, where, function(err,qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
      });

      done();
    });

  });// end updateRun


  describe('getRunExists',function(){

    it('should create a Run exists get query',function(done){

      var where = {
           'RunId' : 3456
          };

      queries.getRunExists(where,function(err,qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("SELECT Count(`grpid`) AS `grpexists` FROM `GroupInfo` WHERE `grpid` = 3456");
      });

      done();
    });
  }); //runExists

  describe('insertRunPlan',function(){

    it('should create a Runs Plan insert query with required parameters in objects',function(done){

      var set = {
           'PLan': 'AB PAT',
           'TestCASE': 'PAT'
          };

      queries.insertRunPlan(set,function(err,qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("INSERT INTO `RunPlans` SET `plan` = \"AB PAT\", `testcase` = \"PAT\"");
      });

      done();
    });


    it('should error if a required param is not provided',function(done){

      var set = {
           'plan': "Sup Bruh",
           'PlanDescription' : "Best Plan" 
          };

      queries.insertRunPlan(set, function(err,qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
      });

      done();
    });

    it('should error if a primary key is provided in set clause',function(done){

      var set = {
           'planId' : 3456 //never allowed
          };

      queries.insertRunPlan(set, function(err,qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
      });

      done();
    });
  });// end insertRunPlan

  describe('updateRunPlan',function(){

    it('should create a Run Plan update querie with required parameters',function(done){

      var set = {
            "Rundescription" : "New Run"
          },
          where = {
            "planId" : 7
          };

      queries.updateRunPlan(set, where, function(err,qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("UPDATE `RunPlans` SET `rundescription` = \"New Run\" WHERE `planid` = 7");
      });

      done();
    });

    it('should error if a required where/set param is not provided',function(done){

      var set = {
           'plandescription' : "Best Plan"
          },
          where = null;

      queries.updateRunPlan(set, where, function(err,qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
      });

      set = null,
      where = {
            "planid" : 7
          };

      queries.updateRunPlan(set, where, function(err,qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
      });

      done();
    });

    it('should error if a primary key is provided in set clause',function(done){

      var set = {
           'PlanId' : 3457 //bad
          },
          where = {
           'PlanId' : 3456 //ok
          };

      queries.updateRunPlan(set, where, function(err,qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
      });

      set = {
           'RunId' : 3456
          },
      where = {
           'RunId' : 777
         };

      queries.updateRunPlan(set, where, function(err,qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
      });

      done();
    });

  });// end updateRunPlan

  describe('getRunPlans',function(){

    it('should create a Test Runs get query',function(done){

      var where = {
           'planid' : 3456,
           'timestamp' : '2017-03-29 10:00:00'
          };

      queries.getRunPlans(where, function(err,qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("SELECT * FROM `RunPlans` WHERE `planid` = 3456 AND `timestamp` = \"2017-03-29 10:00:00\"");
      });

      var where = {
           'plan' : 'emaNnoitatS',
           'TIMESTAMP' : '2017-03-29 10:00:00'
          };

      queries.getRunPlans(where, function(err,qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("SELECT * FROM `RunPlans` WHERE `plan` = \"emaNnoitatS\" AND `timestamp` = \"2017-03-29 10:00:00\"");
      });

      done();
    });

    it('should error if a required param is not provided',function(done){

      var where = {
           'testcase' : "runny run" 
          };

      queries.getRunPlans(where, function(err,qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
      });

      done();
    });

  });// end getRunPlans

  describe('deleteRunPlan',function(){

    it('should create a delete query with where parameters',function(done){

      var where = {
            'planid' : 89
          };

      queries.deleteRunPlan( where, function(err, qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("DELETE FROM `RunPlans` WHERE `planid` = 89");
        done();
      }); 
    });

    it('should error if required param Component and Process or ID is missing', function(done){

      var where = {
            'link' : 'Hey'
          };

      queries.deleteRunPlan( where, function(err, qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
        done();
      });
    });

    it('should error if no where parameters are provided',function(done){

      var where = null;

      queries.deleteRunPlan( where, function(err, qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
        done();
      }); 
    });
  }); //end deleteRunPlan

  describe('insertStepPlan',function(){

    it('should create a Step  Plan insert query with required parameters in objects',function(done){

      var set = {
           'PLan': 'AB PAT',
           'ScriptName': 'wait.tcl'
          };

      queries.insertStepPlan(set,function(err,qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("INSERT INTO `StepPlans` SET `plan` = \"AB PAT\", `scriptname` = \"wait.tcl\"");
      });

      done();
    });


    it('should error if a required param is not provided',function(done){

      var set = {
           'PlanDescription' : "Best Plan" 
          };

      queries.insertStepPlan(set, function(err,qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
      });

      done();
    });

    it('should error if a primary key is provided in set clause',function(done){

      var set = {
           'planId' : 3456 //never allowed
          };

      queries.insertStepPlan(set, function(err,qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
      });

      done();
    });
  });// end insertStepPlan

  describe('updateStepPlan',function(){

    it('should create a Step Plan update query with required parameters',function(done){

      var set = {
            "description" : "New Step Plan"
          },
          where = {
            "planId" : 7
          };

      queries.updateStepPlan(set, where, function(err,qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("UPDATE `StepPlans` SET `description` = \"New Step Plan\" WHERE `planid` = 7");
      });

      done();
    });

    it('should error if a required where/set param is not provided',function(done){

      var set = {
           'plandescription' : "Best Plan"
          },
          where = null;

      queries.updateStepPlan(set, where, function(err,qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
      });

      set = null,
      where = {
            "planid" : 7
          };

      queries.updateStepPlan(set, where, function(err,qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
      });

      done();
    });

    it('should error if a primary key is provided in set clause',function(done){

      var set = {
           'PlanId' : 3457 //bad
          },
          where = {
           'PlanId' : 3456 //ok
          };

      queries.updateStepPlan(set, where, function(err,qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
      });

      done();
    });
  });// end updateStepPlan

  describe('getStepPlans',function(){

    it('should create a Test Steps get query',function(done){

      var where = {
           'planid' : 3456,
           'TIMESTAMP' : '2017-03-29 10:00:00'
          };

      queries.getStepPlans(where, function(err,qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("SELECT * FROM `StepPlans` WHERE `planid` = 3456 AND `timestamp` = \"2017-03-29 10:00:00\"");
      });

      var where = {
           'plan' : 'emaNnoitatS',
           'TIMESTAMP' : '2017-03-29 10:00:00'
          };

      queries.getStepPlans(where, function(err,qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("SELECT * FROM `StepPlans` WHERE `plan` = \"emaNnoitatS\" AND `timestamp` = \"2017-03-29 10:00:00\"");
      });

      done();
    });

    it('should error if a required param is not provided',function(done){

      var where = {
           'scriptname' : "runny run" 
          };

      queries.getStepPlans(where, function(err,qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
      });

      done();
    });

  });// end getStepPlans

  describe('deleteStepPlan',function(){

    it('should create a delete query with where parameters',function(done){

      var where = {
            'planid' : 89
          };

      queries.deleteStepPlan( where, function(err, qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("DELETE FROM `StepPlans` WHERE `planid` = 89");
        done();
      }); 
    });

    it('should error if required param Component and Process or ID is missing', function(done){

      var where = {
            'link' : 'Hey'
          };

      queries.deleteStepPlan( where, function(err, qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
        done();
      });
    });

    it('should error if no where parameters are provided',function(done){

      var where = null;

      queries.deleteStepPlan( where, function(err, qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
        done();
      }); 
    });
  }); //end deleteStepPlan

  describe('insertRunPlanLink',function(){

    it('should create a Run Plan Link insert query with required parameters in objects', function(done){

      var set = {
          'linkurl': "holy_link.com",
          'runPlanId': 1
      };

      queries.insertRunPlanLink(set, function(err,qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("INSERT INTO `RunPlanLinks` SET `linkurl` = \"holy_link.com\", `runplanid` = 1");
      });

      done();
    });


    it('should error if a required param is not provided', function(done){

      var set = {
          'linkurl': "holy_link.com"
      };
      

      queries.insertRunPlanLink(set, function(err,qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
      });

      done();
    });

    it('should error if a primary key is provided in set clause', function(done){

      var set = {
           'linkId' : 3456, //never allowed
           'RUNPLANID': 27,
           'linkurl' : "holy_link.com"
      };
      queries.insertRunPlanLink(set, function(err,qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
      });

      done();
    });
  });// end insertRunPlanLink

  describe('updateRunPlanLink',function(){

    it('should create a Run Plan Link update query with required parameters',function(done){

      var set = {
            "link" : "New Run Plan"
          },
          where = {
            "linkId" : 7
          };

      queries.updateRunPlanLink(set, where, function(err,qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("UPDATE `RunPlanLinks` SET `link` = \"New Run Plan\" WHERE `linkid` = 7");
      });

      done();
    });

    it('should error if a required where/set param is not provided',function(done){

      var set = {
           'link' : "Best Plan"
          },
          where = null;

      queries.updateRunPlanLink(set, where, function(err,qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
      });

      set = null,
      where = {
            "linkid" : 7
          };

      queries.updateRunPlanLink(set, where, function(err,qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
      });

      done();
    });

    it('should error if a primary key is provided in set clause',function(done){

      var set = {
           'linkId' : 3457 //bad
          },
          where = {
           'linkid' : 3456 //ok
          };

      queries.updateRunPlanLink(set, where, function(err,qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
      });

      done();
    });
  });// end updateStepPlanLink

  describe('getRunPlanLinks',function(){

    it('should create a Run Plan Links get query',function(done){

      var where = {
           'linkid' : 3456
          };

      queries.getRunPlanLinks(where, function(err,qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("SELECT * FROM `RunPlanLinks` WHERE `linkid` = 3456");
      });

      var where = {
           'runplanid' : 1
          };

      queries.getRunPlanLinks(where, function(err,qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("SELECT * FROM `RunPlanLinks` WHERE `runplanid` = 1");
      });

      done();
    });

    it('should error if a required param is not provided',function(done){

      var where = {
           'linkurl' : "holy_url.com" 
          };

      queries.getRunPlanLinks(where, function(err,qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
      });

      done();
    });

  });// end getRunPlanLinks

  describe('deleteRunPlanLinks',function(){

    it('should create a delete query with where parameters',function(done){

      var where = {
            'link' : 'Super Link',
            'runplanid' : 89
          };

      queries.deleteRunPlanLinks( where, function(err, qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("DELETE FROM `RunPlanLinks` WHERE `link` = \"Super Link\" AND `runplanid` = 89");
        done();
      }); 
    });

    it('should error if required param is missing', function(done){

      var where = {
            'link' : 'Hey'
          };

      queries.deleteRunPlanLinks( where, function(err, qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
        done();
      });
    });
  }); //end deleteRunPlanLinks

  describe('insertStepPlanLink',function(){

    it('should create a Step Plan Link insert query with required parameters in objects', function(done){

      var set = {
           'linkurl': "holy_link.com",
           'stepPlanId': 1
      };

      queries.insertStepPlanLink(set, function(err,qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("INSERT INTO `StepPlanLinks` SET `linkurl` = \"holy_link.com\", `stepplanid` = 1");
      });

      done();
    });


    it('should error if a required param is not provided', function(done){

      var set = {
              linkurl: "holy_link.com"
      };
      

      queries.insertStepPlanLink(set, function(err,qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
      });

      done();
    });

    it('should error if a primary key is provided in set clause', function(done){

      var set = {
           'linkId' : 3456, //never allowed
           'STEPPLANID': 4,
           'linkurl' : "holy_link.com"
      };

      queries.insertStepPlanLink(set, function(err,qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
      });

      done();
    });
  });// end insertStepPlanLink

  describe('updateStepPlanLink',function(){

    it('should create a Step Plan Link update query with required parameters',function(done){

      var set = {
            "link" : "New Step Plan"
          },
          where = {
            "linkId" : 7
          };

      queries.updateStepPlanLink(set, where, function(err,qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("UPDATE `StepPlanLinks` SET `link` = \"New Step Plan\" WHERE `linkid` = 7");
      });

      done();
    });

    it('should error if a required where/set param is not provided',function(done){

      var set = {
           'link' : "Best Plan"
          },
          where = null;

      queries.updateStepPlanLink(set, where, function(err,qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
      });

      set = null,
      where = {
            "linkid" : 7
          };

      queries.updateStepPlanLink(set, where, function(err,qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
      });

      done();
    });

    it('should error if a primary key is provided in set clause',function(done){

      var set = {
           'linkId' : 3457 //bad
          },
          where = {
           'linkid' : 3456 //ok
          };

      queries.updateStepPlanLink(set, where, function(err,qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
      });

      done();
    });
  });// end updateStepPlanLink

  describe('getStepPlanLinks',function(){

    it('should create a Step Plan Links get query',function(done){

      var where = {
           'linkid' : 3456
          };

      queries.getStepPlanLinks(where, function(err,qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("SELECT * FROM `StepPlanLinks` WHERE `linkid` = 3456");
      });

      var where = {
           'stepplanid' : 1
          };

      queries.getStepPlanLinks(where, function(err,qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("SELECT * FROM `StepPlanLinks` WHERE `stepplanid` = 1");
      });

      done();
    });

    it('should error if a required param is not provided',function(done){

      var where = {
           'linkurl' : "holy_url.com" 
          };

      queries.getStepPlanLinks(where, function(err,qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
      });

      done();
    });

  });// end getStepPlanLinks

  describe('deleteStepPlanLinks',function(){

    it('should create a delete query with where parameters',function(done){

      var where = {
            'link' : 'Super Link',
            'stepplanid' : 89
          };

      queries.deleteStepPlanLinks( where, function(err, qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("DELETE FROM `StepPlanLinks` WHERE `link` = \"Super Link\" AND `stepplanid` = 89");
        done();
      }); 
    });

    it('should error if required param is missing', function(done){

      var where = {
            'link' : 'Hey'
          };

      queries.deleteStepPlanLinks( where, function(err, qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
        done();
      });
    });
  }); //end deleteStepPlanLinks

  describe('insertStep',function(){

    it('should create a Step insert query with required parameters',function(done){

      var set = {
           'testCase' : 'CASE you were wondering',
           'Datetime': '2017-03-29 10:00:00' 
          },
          params = {
            'RunId' : 89
          };

      queries.insertStep(set, params, function(err,qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("INSERT INTO `TestInfo` SET `testcase` = \"CASE you were wondering\", `datetime` = \"2017-03-29 10:00:00\", `grpid` = 89");
      });

      set = {
           'testCase' : 'CASE you were wondering'
          },
          params = {
            'RunId' : 89
          };

      queries.insertStep(set, params, function(err,qStr){
        expect(err).to.be.null;
        expect(qStr).to.match(/`datetime`/);
      });

      done();
    });

    it('should handle samparamfile field properly',function(done){

      var set = {
           'testCase' : 'CASE you were wondering',
           'Datetime': '2017-03-29 10:00:00',
           'configFILE': 'hey, bye, here there'  
          },
          params = {
            'RunId' : 89
          };

      queries.insertStep(set, params, function(err,qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("INSERT INTO `TestInfo` SET `testcase` = \"CASE you were wondering\", `datetime` = \"2017-03-29 10:00:00\", `samparamfile` = \"hey,bye,here there\", `grpid` = 89");
      });

      set = {
           'testCase' : 'CASE you were wondering',
           'Datetime': '2017-03-29 10:00:00',
           'configFILE': ['hey','bye','here there'] 
          },
          params = {
            'RunId' : 89
          };
      queries.insertStep(set, params, function(err,qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("INSERT INTO `TestInfo` SET `testcase` = \"CASE you were wondering\", `datetime` = \"2017-03-29 10:00:00\", `samparamfile` = \"hey,bye,here there\", `grpid` = 89");
      });

      set = {
           'testCase' : 'CASE you were wondering',
           'Datetime': '2017-03-29 10:00:00',
           'configFILE': {} 
          },
          params = {
            'RunId' : 89
          };
      queries.insertStep(set, params, function(err,qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("INSERT INTO `TestInfo` SET `testcase` = \"CASE you were wondering\", `datetime` = \"2017-03-29 10:00:00\", `grpid` = 89");
      });

      done();
    });

    it('should error if a invalid params are provided',function(done){

      var set = {
           'TeSTCase' : 'A TestCase' 
          },
          params = {
           'blahid' : 3456
          };;

      queries.insertStep(set, params, function(err,qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
      });

      set = {
       'TeSTCase' : 'A TestCase' 
      },
      params = {
       'RunID' : 3456,
       'stepID' : 7
      };

      queries.insertStep(set, params, function(err,qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
      });

      done();
    });
  });// end insertStep

  describe('updateStep',function(){

    it('should create a Step update query with required parameters',function(done){

      var set = {
            "Status" : "running",
            "TestcaSe" : "The Great CASE" 
          },
          where = {
            "RunId" : 7,
            "stepID" : 9
          };

      queries.updateStep(set, where, function(err,qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("UPDATE `TestInfo` SET `status` = \"running\", `testcase` = \"The Great CASE\" WHERE `grpid` = 7 AND `testid` = 9");
      });

      done();
    });

    it('should error if a required where/set param is not provided',function(done){

      var set = {
           'Status' : 'complete' 
          },
          where = null; 

      queries.updateStep(set, where, function(err,qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
      });

      set = {},
      where = {
            "RunId" : 7,
            "stepID" : 1
          };

      queries.updateStep(set, where, function(err,qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
      });

      done();
    });

    it('should error if a primary key is provided in set clause',function(done){

      var set = {
           'GrpId' : 3456 //bad
          },
          where = {
           'RunId' : 3456, //ok
           'TestId' : 6
          };

      queries.updateStep(set, where, function(err,qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
      });

      set = {
           'RunId' : 3456 //bad
          },
      where = {
           'RunId' : 777,
           'TestId' : 6
         };

      queries.updateStep(set, where, function(err,qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
      });

      done();
    });

  });// end updateStep

  describe('getNextStep',function(){

    it('should create a max steps query',function(done){

      var where = {
           'RunId' : 3456,
          };

      queries.getNextStep(where,function(err,qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("SELECT Max(`testid`) + 1 AS `nexttestid` FROM `TestInfo` WHERE `grpid` = 3456");
      });

      done();
    });
  }); //getNextStep

  describe('getStepExists',function(){

    it('should create a Run exists get query',function(done){

      var where = {
           'STEPID' : 7,
           'RunId' : 3456
          };

      queries.getStepExists(where,function(err,qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("SELECT Count(*) AS `stepexists` FROM `TestInfo` WHERE `testid` = 7 AND `grpid` = 3456");
      });

      done();
    });
  }); //stepExists

  describe('getSteps',function(){

    it('should create a Steps get query',function(done){

      var where = {
           'RunId' : 3456,
           'Result' : 'pass'
          };

      queries.getSteps(where,function(err,qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("SELECT * FROM `TestInfo` WHERE `grpid` = 3456 AND `specpassfail` = \"pass\"");
      });

      where = {
           'testcase' : 'emaNnoitatS.txt',
          };

      queries.getSteps(where,function(err,qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("SELECT * FROM `TestInfo` WHERE `testcase` = \"emaNnoitatS.txt\"");
      });

      where = {
           'scriptname' : 'emaNnoitatS.tcl',
          };

      queries.getSteps(where,function(err,qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("SELECT * FROM `TestInfo` WHERE `scriptname` = \"emaNnoitatS.tcl\"");
      });

      done();
    });

    it('should error if a required param is not provided',function(done){

      var where = {
           'TestID' : 3456
          };

      queries.getSteps(where, function(err,qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
      });

      done();
    });

  });// end getSteps

  describe('getVerificationPoints',function(){

    it('should create a VerificationPoints get query with any single required param grpid,testid,name',function(done){

      var where = {
           'RunID' : 3456,
           'RESULT': 'pass'
          };

      queries.getVerificationPoints(where,function(err,qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("SELECT * FROM `VerificationPoints` WHERE `grpid` = 3456 AND `result` = \"pass\"");
      });

      where = {
           'id' : 3
          };

      queries.getVerificationPoints(where,function(err,qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("SELECT * FROM `VerificationPoints` WHERE `id` = 3");
      });

      where = {
           'Name' : 'a name' 
          };

      queries.getVerificationPoints(where,function(err,qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("SELECT * FROM `VerificationPoints` WHERE `name` = \"a name\"");
      });

      where = {
           'Name' : 'a name',
           'Datetime': '0000-00-00 00:00:00',
           'Type': 'float' 
          };

      queries.getVerificationPoints(where,function(err,qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("SELECT * FROM `VerificationPoints` WHERE `name` = \"a name\" AND `datetime` = \"0000-00-00 00:00:00\" AND `type` = \"float\"");
      });

      done();
    });

    it('should error if a required param is not provided',function(done){

      var where = {
           'TestID' : 3456
          };

      queries.getVerificationPoints(where, function(err,qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
      });

      done();
    });
  });// end getVerificationPoints

  describe('insertVersionInfo',function(){

    it('should create a VersionInfo insert query with required parameters',function(done){

      var set = {
           'name': 'CrazyLibs',
           'TYPE' : 'node',
           'Version' : '0.7.0'
          },
          params = {
            'RunId' : 89
          };

      queries.insertVersionInfo(set, params, function(err,qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("INSERT INTO `VersionInfo` SET `name` = \"CrazyLibs\", `type` = \"node\", `version` = \"0.7.0\", `grpid` = 89");
      });

      done();
    });

    it('should error if a required param is not provided',function(done){

      var set = {
           'TestID' : 3456
          },
          params = null;

      queries.insertVersionInfo(set, params,  function(err,qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
      });

      var set = {
           'name': 'CrazyLibs',
           'Version' : '0.7.0'
          },
          params = {
            'RunId' : 89
          };

      queries.insertVersionInfo(set, params,  function(err,qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
      });

      done();
    });
  });// end insertVersionInfo

  describe('getVersionInfo',function(){

    it('should create a VersionInfo get query with require params',function(done){

      var where = {
           'RunID' : 3456
          };

      queries.getVersionInfo(where,function(err,qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("SELECT * FROM `VersionInfo` WHERE `grpid` = 3456");
      });

      where = {
           'name' : 'bestPackage' 
          };

      queries.getVersionInfo(where,function(err,qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("SELECT * FROM `VersionInfo` WHERE `name` = \"bestPackage\"");
      });


      done();
    });
  }); //getVersionInfo

  describe('insertAttribute',function(){

    it('should create an Attribute insert query with required parameters',function(done){

      var set = {
           'name': 'attr1',
           'value': '0'
          },
          params = {
            'RunId': 89,
            'stepID': 6
          };

      queries.insertAttribute(set, params, function(err,qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("INSERT INTO `Attributes` SET `name` = \"attr1\", `value` = 0, `grpid` = 89, `testid` = 6");
      });

      done();
    });

    it('should error if a required param is not provided',function(done){

      var set = {
           'TestID': 3456
          },
          params = null;

      queries.insertAttribute(set, params,  function(err,qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
      });

      var set = {
           'name': 'CrazyLibs',
          },
          params = {
            'RunId' : 89,
            'testId' : 7 
          };

      queries.insertAttribute(set, params,  function(err,qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
      });

      done();
    });
  });// end insertVersionInfo

  describe('getAttributes',function(){

    it('should create an Attribute get query with require params',function(done){

      var where = {
           'RunID' : 3456
          };

      queries.getAttributes(where,function(err,qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("SELECT * FROM `Attributes` WHERE `grpid` = 3456");
      });

      where = {
           'name' : 'These Attrs'
          };

      queries.getAttributes(where,function(err,qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("SELECT * FROM `Attributes` WHERE `name` = \"These Attrs\"");
      });


      done();
    });
  }); //getVersionInfo

  describe('getVipcatVerificationPoints',function(){

    it('should create a vipcat verification point query with a proper filters',function(done){

      var body = {
           name : 'Hi', //queries ignore this field
           filters : {
             vpfilter: [['name','=','Cool Vps','OR']]
           } 
          };

      queries.getVipcatVerificationPoints(body,function(err,qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("SELECT * FROM `VerificationPoints` WHERE ( `name` = \"Cool Vps\" ) ORDER BY UNIX_TIMESTAMP(`datetime`) DESC LIMIT 1000000");
      });

      body = {
           name : 'Hi', //queries ignore this field
           filters : {
             vpfilter: [['name','=','Cool Vps','OR'],['name','=','Uncool Vps','AND']],
             testfilter: [['scriptname','=','Cool script','AND']]
           } 
          };

      queries.getVipcatVerificationPoints(body,function(err,qStr){
        expect(err).to.be.null;
        expect(qStr).to.equal("SELECT * FROM `VerificationPoints` WHERE ( `name` = \"Cool Vps\" OR `name` = \"Uncool Vps\" ) AND (`testid`,`grpid`) IN " + 
                              "(SELECT `testid`,`grpid` FROM `TestInfo` WHERE `TestInfo`.`scriptname` = \"Cool script\") " + 
                              "ORDER BY UNIX_TIMESTAMP(`datetime`) DESC LIMIT 1000000");
      });

      done();
    });

    it('should error if a required param is not provided',function(done){

      var body = {
           name : 'Hi', //queries ignore this field
           filters : null 
          };

      queries.getVipcatVerificationPoints(body, function(err,qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
      });

      body = {
         name : 'Hi', //queries ignore this field
         filters : {} 
        };

      queries.getVipcatVerificationPoints(body, function(err,qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
      });

      body = {
         name : 'Hi', //queries ignore this field
         filters : {
           aKey:[]
         } 
        };

      queries.getVipcatVerificationPoints(body, function(err,qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
      });

      body = {
         name : 'Hi', //queries ignore this field
         filters : {
           vpfilter:[]
         } 
        };

      queries.getVipcatVerificationPoints(body, function(err,qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
      });
   
      // missing name in vpfilter
      body = {
       name : 'Hi', //queries ignore this field
       filters : {
         vpfilter: [['key1','=','val','or'],['key2','=','val','and'],['key3','=','val','logic']] 
       }
     };

      queries.getVipcatVerificationPoints(body, function(err,qStr){
        expect(qStr).to.be.undefined;
        expect(err).to.not.be.null;
      });

      done();
    });
  });
  */
}); //end Query building tests

