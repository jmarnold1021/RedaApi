// dev dependancies
var expect    = require("chai").expect,
    request = require("request"),
    async = require("async"),
    cuid = require("cuid"),
    fs = require("fs"),
    recursiveRead = require('recursive-readdir'),
    cp = require('child_process'),
    rimraf = require('rimraf'),
    path = require("path"),
    debug = require('debug'),
    tar = require("tar");


var redaUtils = require('../lib/reda-utils')( cp, fs, rimraf, recursiveRead, debug );

var testId = cuid(),
    uploadDir = "test/upload",
    downloadDir = "test/download";

var NUM_STEPS_PER_RUN = process.env.NUM_STEPS_PER_RUN || 8,
    NUM_VPS_PER_STEP  = process.env.NUM_VPS_PER_STEP  || 16,
    NUM_VERS_PER_RUN  = process.env.NUM_VERS_PER_STEP || 4;

var apiDevRequest = request.defaults({
  /*,auth: {
    username: "",
    password: ""
  }*/
});

var createArchive = function(runId, cb){

  var archiveDir = path.join(uploadDir, runId.toString());

  fs.mkdirSync(archiveDir);

  var files = [
    redaUtils.makeDirectory.bind(null, archiveDir + "/uploads"),
    redaUtils.writeFile.bind(null, archiveDir + "/archive_data.csv", "A,CSV,File\n1,2,3\n4,5," + runId),
    redaUtils.writeFile.bind(null, archiveDir + "/archive_data.json", JSON.stringify({"A":"JSON FILE"})),
    redaUtils.writeFile.bind(null, archiveDir + "/archive_data.txt", "Just a plain ol text file")
  ];
  async.parallel(files, function(err){

    if(err){
      return cb(err);
    }

    tar.c({
      gzip: true,
      file: archiveDir + ".tgz",
      cwd: uploadDir
    },[runId.toString()],function(tarErr){
      if(tarErr){
        console.log(tarErr);
        return cb(tarErr);
      }
      return cb(null);
    });
  });
};

var uploadArchive = function(runId, cb){

    var archiveDir = path.join(uploadDir, runId.toString());
    var options = {
      url: '/results/' + runId,
      method: "POST",
      headers: [
        {
          name: 'Content-Type',
          value: 'application/octet-stream'
        }
      ],
      body: fs.readFileSync(archiveDir + ".tgz")
    };
    apiDevRequest(options,function(err, res, body){

        if(err){
          return cb(err);
        }

        body = JSON.parse(body);
        expect(+res.statusCode).to.equal(200);
        expect(+body.code).to.equal(200);
        return cb(null);
    });
};

var saveFile = function(runId, cb){

    //var archiveDir = path.join(uploadDir, runId.toString());

    var options = {
      url: '/results/' + runId + '/saveFile?Filename=upload.json',
      method: "POST",
      headers: [
        {
          name: 'Content-Type',
          value: 'application/octet-stream'
        }
      ],
      body: '{"File":"json"}'
    };

    apiDevRequest(options,function(err, res, body){

        if(err){
          return cb(err);
        }

        body = JSON.parse(body);
        expect(+res.statusCode).to.equal(200);
        expect(+body.code).to.equal(200);
        return cb(null);
    });
};

var downloadArchive = function(runId, cb){

    var options = {
      url: '/results/' + runId,
      method: "GET"
    };
    
    var archiveFile = path.join(downloadDir, runId.toString() + ".tgz"),
        reqStream = apiDevRequest(options),
        fsStream = redaUtils.getFileWriteStream(archiveFile);

    reqStream.on('error', function(err){
      return cb(err);
    });
    reqStream.on('response',function(res){
      expect(+res.statusCode).to.equal(200);
    });
    fsStream.on('close', function(){
      redaUtils.stat(archiveFile, function(statErr, stats){
        if(statErr){
          return cb(statErr);
        }
        expect(stats.type).to.equal("file");
        return cb(null);
      });
    });
    reqStream.pipe(fsStream);
};

var insertRun = function(cb){
    var options = {
      url: '/run',
      method: "POST",
      body: {
        "Project": "ReDa Api Test",
        "RunName" : testId,
        "TestCase" : "API_E2E" 
      },
      json: true
    };
    apiDevRequest(options, function(err, res, body){

        if(err){
          return cb(err);
        }

        expect(+res.statusCode).to.equal(200); 
        expect(+body.code).to.equal(200);
        return cb(null,body.data.insertId);
    });
};

var updateRun = function(runid, cb){
    var options = {
      url: '/run/' + runid,
      method: "POST",
      body: {
        "StationName" : testId
      },
      json: true
    };
    apiDevRequest(options, function(err, res, body){

        if(err){
          return cb(err);
        }
        expect(+res.statusCode).to.equal(200); 
        expect(+body.code).to.equal(200);
        expect(+body.data.affectedRows).to.equal(1);
        return cb(null);
    });
};

var insertStep = function(runId, cb){
    var options = {
      url: '/run/' + runId + '/step',
      method: "POST",
      body: {
        "TestCase": "API_E2E_" + runId,
        "ScriptName": testId 
      },
      json: true
    };

    apiDevRequest(options,function(err, res, body){
        if(err){
          return cb(err);
        }
        expect(+res.statusCode).to.equal(200);
        expect(+body.code).to.equal(200);
        return cb(null, body.data.insertId);
    });
};

var updateStep = function(runId, stepId, cb){
    var options = {
      url: '/run/' + runId + '/step/' + stepId,
      method: "POST",
      body: {
        "ConfigFile": testId
      },
      json: true
    };

    apiDevRequest(options,function(err, res, body){
        if(err){
          return cb(err);
        }
        expect(+res.statusCode).to.equal(200);
        expect(+body.code).to.equal(200);
        expect(+body.data.affectedRows).to.equal(1);
        return cb(null, body.data.insertId);
    });
};

var insertVp = function(runId, stepId, cb){

    var options = {
      url: '/run/' + runId + '/step/' + stepId + '/verificationPoint',
      method: "POST",
      body: {
        "Type": "API_E2E_" + runId + "_" + stepId,
        "Name": testId,
        "Operator": "Bruh?",
        "ExpectedValue": "true",
        "ResultValue": "true",
        "Result" : "pass" 
      },
      json: true
    };

    apiDevRequest(options,function(err, res, body){
        if(err){
          return eachCb(err);
        }
        expect(+res.statusCode).to.equal(200);
        expect(+body.code).to.equal(200);
        return cb(null, body.data.insertId);
    });
};

var insertVersionInfo = function(runId, cb){
    var options = {
      url: '/run/' + runId + '/versionInfo',
      method: "POST",
      body: {
        "Name": "Version_" + runId + "_" + (Math.random()+1).toString(36).substring(7),
        "Type": "dhcp",
        "Version": testId
      },
      json: true
    };

    apiDevRequest(options,function(err, res, body){
        if(err){
          return cb(err);
        }
        expect(+res.statusCode).to.equal(200);
        expect(+body.code).to.equal(200);
        return cb(null);
    });
};

var getRun = function(runId, cb){
  var options = {
    url: '/runs?RunID=' + runId,
    method: "GET",
    json: true
  };
  apiDevRequest(options,function(err, res, body){
      if(err){
        return cb(err);
      }
      expect(+res.statusCode).to.equal(200);
      expect(+body.code).to.equal(200);
      expect(body.data).to.have.lengthOf(1);
      expect(body.data[0].RunName).to.equal(testId); //insert
      expect(body.data[0].StationName).to.not.equal(null); //insert default
      expect(body.data[0].StationName).to.equal(testId); //update
      return cb(null);
  });
};

var getSteps = function(runId, stepIds, cb){
    async.eachOf(stepIds, function(stepId, idx, eachCb){
        var options = {
          url: '/steps?RunID=' + runId + '&StepID=' + stepId,
          method: "GET",
          json: true
        };

        apiDevRequest(options,function(err, res, body){
            if(err){
              return eachCb(err);
            }
            expect(+res.statusCode).to.equal(200);
            expect(+body.code).to.equal(200);
            expect(body.data).to.have.lengthOf(1);
            expect(body.data[0].ScriptName).to.equal(testId); //insert
            expect(body.data[0].ConfigFile).to.not.equal(null); //insert default
            expect(body.data[0].ConfigFile).to.equal(testId); //update
            return eachCb(null);
        });
    },
    function(eachErr){
      if(eachErr){
        return cb(eachErr);
      }
      return cb(null);
    });
};

var getVps = function(runId, stepId, vpIds, cb){
    async.each(vpIds, function(vpId, eachCb){

        var options = {
          url: '/verificationPoints?RunID=' + runId + '&StepID=' + stepId + '&id=' + vpId,
          method: "GET",
          json: true
        };

        apiDevRequest(options,function(err, res, body){
            if(err){
              return eachCb(err);
            }
            expect(+res.statusCode).to.equal(200);
            expect(+body.code).to.equal(200);
            expect(body.data).to.have.lengthOf(1);
            expect(body.data[0].Name).to.equal(testId);
            return eachCb(null);
        });
    },
    function(eachErr){
      if(eachErr){
        return cb(eachErr);
      }
      return cb(null);
    });
};

var getVersions = function(runId, cb){
  var options = {
    url: '/versionInfo?RunID=' + runId,
    method: "GET",
    json: true
  };
  apiDevRequest(options,function(err, res, body){
      if(err){
        return cb(err);
      }
      expect(+res.statusCode).to.equal(200);
      expect(+body.code).to.equal(200);
      expect(body.data).to.have.lengthOf(NUM_VERS_PER_RUN);
      expect(body.data[0].Version).to.equal(testId);
      return cb(null);
  });
};


var insertsE2E = function(insertCb){

  //Insert/Get Run
  var results = {};
  results.runid = 0;
  results.stepids = [];
  results.vpids = [];

  insertRun(function(insertRunErr, runId){

    expect(insertRunErr).to.be.null;
    expect(runId).to.not.be.null;
    results.runid = runId;

    //Insert/Get VersionInfo/Steps on Run
    var insertSteps = new Array(NUM_STEPS_PER_RUN).fill(insertStep.bind(null, runId));

    async.series(insertSteps, function(insertStepsErr, stepIds){

      expect(insertStepsErr).to.be.null; 
      expect(stepIds.length).to.equal(NUM_STEPS_PER_RUN);
      for( var i in stepIds ){
          expect(+stepIds[i]).to.equal(+i + 1);
      }

      results.stepids = stepIds;

      async.eachSeries(stepIds, function(stepId, eachCb){
          var insertVps = new Array(NUM_VPS_PER_STEP).fill(insertVp.bind(null, runId, stepId));
          async.series(insertVps, function( insertVpsErr, vpIds){
            if(insertVpsErr){
              return eachCb(insertVpsErr);
            }
            expect(vpIds.length).to.equal(NUM_VPS_PER_STEP);
            results.vpids.push(vpIds);          
            return eachCb(null);
          });
      }, function(eachStepErr){

        expect(eachStepErr).to.be.null;

        var insertVersions = new Array(NUM_VERS_PER_RUN).fill(insertVersionInfo.bind(null, runId));
        async.series(insertVersions, function(insertVersErr){
          expect(insertVersErr).to.be.null;
          return insertCb( null, results );
        });
      });
    });
  });
};

var updatesE2E = function(results, updateCb){

  updateRun(results.runid, function(updateRunErr){

    expect(updateRunErr).to.be.null;

    async.eachOf(results.stepids, function(stepid, idx, eachStepCb){
      updateStep(results.runid, results.stepids[idx], function(updateStepErr){
        if(updateStepErr){
          return eachStepCb(updateStepErr);
        }
        return eachStepCb(null);
      });
    }, function(eachStepsErr){
      expect(eachStepsErr).to.be.null;
      updateCb(null, results);
    });
  });
};

var getsE2E = function(results, getCb) {

  async.parallel([
    getRun.bind(null, results.runid),
    getVersions.bind(null, results.runid)
  ], function(getRunErr){

    expect(getRunErr).to.be.null;

    getSteps(results.runid, results.stepids, function(getStepsErr){

      expect(getStepsErr).to.be.null;

      async.eachOf(results.stepids, function(stepid, idx, eachStepCb){

        getVps( results.runid, results.stepids[idx], results.vpids[idx], function(getVpsErr){
          if(getVpsErr){
            return eachStepCb(getVpsErr);
          }
          return eachStepCb(null);
        });
      }, function(eachStepsErr){
        expect(eachStepsErr).to.be.null;
        return getCb(null,results);
      });
    });
  });
};

var archiveE2E = function(results, archiveCb){
  // Send An Archive
  archive = [
    createArchive.bind(null, results.runid),
    uploadArchive.bind(null, results.runid),
    saveFile.bind(null, results.runid),
    downloadArchive.bind(null, results.runid)
  ];
  async.series(archive,function(archiveErr){
    expect(archiveErr).to.be.null;
    return archiveCb(null, results);
  });
};


describe("ReDa REST e2e Test: " + testId, function(){

  this.timeout(0);

  before(function() {
    rimraf.sync(uploadDir,{});
    rimraf.sync(downloadDir,{});
    fs.mkdirSync(uploadDir);
    fs.mkdirSync(downloadDir);
  });

  after(function() {
    rimraf.sync(uploadDir,{});
    rimraf.sync(downloadDir,{});
  });
  
  it("Should Insert/Update/Retrieve Run/Steps/Vps/Versions Correctly and Create/Upload/Download an Archive for the Test Run", function(done){
    async.waterfall([
      insertsE2E,
      updatesE2E,
      getsE2E,
      archiveE2E // do archives at the end to seperate concerns
    ], function(E2EError){
      expect(E2EError).to.be.null;
      done();
    });
  });
});

