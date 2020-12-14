#!/usr/bin/env node

// script is run in a one off container with duplicate env of service containers
// DEPS. ENV and this SCRIPT are available in that container. Since it was not
// created during deploy nginx will not route any requests to it.


// It is recommeneded to not turn on cleanup unti the backup task has been verified or you just need to clean up

// DEPS
var async = require('async'),
    fs = require('fs'),
    path = require('path'),
    dateformat = require('dateformat'),
    rimraf = require('rimraf'),
    tar = require('tar'),
    stream = require('stream'),
    S3 = require('aws-sdk/clients/s3');


// ENV 
var REDA_RESULTS_PATH = process.env.REDA_RESULTS_PATH,
    LOG_PATH = process.env.LOG_PATH || '/tmp',
    S3_RESULTS_BACKUP = process.env.S3_RESULTS_BACKUP,
    S3_RESULTS_BACKUP_DAYS = process.env.S3_RESULTS_BACKUP_DAYS,
    S3_RESULTS_BACKUP_BUCKET = process.env.S3_RESULTS_BACKUP_BUCKET,
    S3_RESULTS_BACKUP_AKEY = process.env.S3_RESULTS_BACKUP_AKEY,
    S3_RESULTS_BACKUP_SKEY = process.env.S3_RESULTS_BACKUP_SKEY,
    S3_RESULTS_BACKUP_CLEAN = process.env.S3_RESULTS_BACKUP_CLEAN;


// GLOBAL
var NOW = dateformat(new Date(), "isoDateTime"),
    NOW_MS = new Date().getTime(),
    S3_RESULTS_BACKUP_MS = +S3_RESULTS_BACKUP_DAYS * 24 * 60 * 60 * 1000,
    LOG_FILE_PATH = path.join(LOG_PATH,'reda_results_cleanup_log.json');

// TASKS
var statResult = function(result, statCb){

  if( isNaN(result) ){
    return statCb(new Error('Result was not a numbered result archive'), 'Skipped');
  }

  var resultFullPath = path.join(REDA_RESULTS_PATH, result);
  fs.stat(resultFullPath, function(statErr, stats){

    if(statErr){
      return statCb(statErr.message || statErr, 'Failure');
    }
 
    var retTime = new Date(stats.mtime).getTime() + S3_RESULTS_BACKUP_MS;
    if( !stats.isDirectory() ) {
      return statCb(new Error('Result is not a directory'), 'Skipped');
    }

    if( retTime >= NOW_MS ){
      return statCb(new Error('Result is newer than cleanup window'), 'Skipped');
    }

    return statCb(null,'Success');
  });
};

var s3BackupResult = function(result, backupCb){

  var tarErrors = [],
      tarchiver = tar.create({
        cwd: REDA_RESULTS_PATH,
        gzip: true,
      },[result])
  .on('warn', function(message){
    tarErrors.push(message);
  });

  var s3 = new S3({
        accessKeyId: S3_RESULTS_BACKUP_AKEY, 
        secretAccessKey: S3_RESULTS_BACKUP_SKEY 
      }),
      params = {
        Bucket: S3_RESULTS_BACKUP_BUCKET,
        Key: result + '.tar.gz',
        Body: tarchiver.pipe(new stream.PassThrough()) 
      };

  s3.upload(params, function(s3UploadErr){

    if(tarErrors.length != 0){
      if(s3UploadErr){
        tarErrors.push( s3UploadErr.message || s3UploadErr );
      }
      return backupCb(tarErrors, 'Failure');
    }

    if(s3UploadErr){
      return backupCb(s3UploadErr.message || s3UploadErr, 'Failure');
    }

    return backupCb(null, 'Success');
  });
};

var cleanResult = function(result, cleanCb){

  var resultFullPath = path.join(REDA_RESULTS_PATH, result);
  rimraf(resultFullPath, {disableGlob:true}, function(cleanErr){
    if(cleanErr){
      return cleanCb(cleanErr.message || cleanErr, 'Failure');
    }
    return cleanCb(null, 'Success');
  });
};

// MAIN
var startBackup = function(done){

  var backupResults = {
        reda_results_path: REDA_RESULTS_PATH,
        s3_backup_date: NOW,
        s3_backup: S3_RESULTS_BACKUP,
        s3_backup_bucket: S3_RESULTS_BACKUP_BUCKET,
        s3_backup_days: S3_RESULTS_BACKUP_DAYS,
        s3_backup_clean: S3_RESULTS_BACKUP_CLEAN
  };

  if( !REDA_RESULTS_PATH ||
      !S3_RESULTS_BACKUP ||
      isNaN(S3_RESULTS_BACKUP_MS) ){
    
    backupResults.error = 'No Reda Results Path or S3 Backup or S3 Backup window configured';
    return done(null, backupResults); 
  }

  
  fs.readdir(REDA_RESULTS_PATH, function(readErr, results){

    if(readErr){
      backupResults.error = readErr.message || readErr;
      return done(null, backupResults);
    }


    async.eachSeries(results, function(result, eachCb){
         
        var tasks = {
          stat: statResult.bind(null, result),
          backup: s3BackupResult.bind(null, result)
        };

        // need extra env var to clean resutls as well as a bckup
        if( S3_RESULTS_BACKUP_CLEAN ){
          tasks.clean = cleanResult.bind(null, result);
        } 

        backupResults[result] = {};

        async.series(tasks, function(backupErr, backupResult){

          // an dict of each tasks success/skipped/failed status
          backupResults[result] = backupResult;

          // add the error message here.
          if(backupErr){
            backupResults[result].error = backupErr.message || backupErr;
          }

          return eachCb(null); //continue
        });
    }, function(eachErr){
      // accumulation of errors/successes in a fun format
      return done(null, backupResults);
    });
  });
};

// RUN 
startBackup(function(backupErr, backupResults) {

  fs.writeFile(LOG_FILE_PATH, JSON.stringify(backupResults), 'utf8', function(writeErr){

    if(writeErr){
      console.log('Error writing backup log');
      console.log(backupResults);
      process.exit(1);
    }

    if(backupResults.error){
      process.exit(1);
    }

    process.exit(0);
  });
});
