module.exports = function( cp, fs, rimraf, recursiveRead, debug ){

    debug = debug('lib:UTILS');

    var utilsError = function(err){
        switch(err.code){
            case "EEXIST":
                err.message = 'The specified file already exists at the provided path';
                err.status = 400;
                return err;
            case "EISDIR":
                err.message = 'An operation expected a file, but the given pathname was a directory.';
                err.status = 400;
                return err;
            case "EMFILE":
                err.message = 'Too many open files on the system, add (ulimit -n 2048) in node process';
                err.status = 500;
                return err;
            case "ENOTDIR":
                err.message = 'A component of the given pathname existed, but was not a directory as expected';
                err.status = 400;
                return err;
            case "ENOENT":
                err.message = 'No such file or directory';
                err.status = 400;
                return err;
            case "EACCES":
                err.message = 'Permission denied while attempting to access file';
                err.status = 400;
                return err;
            default:
              // even if this is a client error, it is not handled properly 
              // and should be reported as a server
              err.message = 'fs : ' + err.code || 'NOCODE' + ' : ' + err.message || '';
              err.status = 500;
              return err;
        };
    };

    return {

        getError : utilsError,
 
        executeVipcat : function( configPath, cb){

          debug('[executeVipcat] executing vipcat at configPath:', configPath);

          var cmd = './node_modules/.bin/vipcat create -c ' + configPath;
          // it writes only a few logs to stdout so exec should be fine here
          cp.exec(cmd, { encoding: 'buffer' }, function(execErr, stdout, stderr) {

              if ( execErr ) {
                  debug('[executeVipcat]','EXECERR : '+ execErr.message);
                  execErr.status = 500;
                  return cb(execErr);
              }

              // check vipcat stderr for err msg
              if( stderr && stderr.toString() !== '' ){
                  debug('[executeVipcat]','STDERR: '+ stderr.toString());
                  var stdErr = new Error(stderr.toString());
                  stdErr.status = 500;
                  return cb(stdErr);
              }

              // incase logging is increased 
              if( stdout && stdout.toString() !== '' ){
                  debug('[executeVipcat]','STDOUT: '+ stdout.toString());
              }

              debug('[executeVipcat]','Successfully executed ' + cmd );
              return cb(null, stdout.toString());
          });
      },

      writeFile : function( outPath, data,  fileCb ){

          debug('[writeFile] outPath:', outPath);
          fs.writeFile(outPath, data, function(writeErr){

              if(writeErr){
                  return fileCb(utilsError(writeErr));
              }

              debug('[writeFile]','File written successfully');

              return fileCb(null);
          });
      },

      getFileWriteStream : function( outPath ){
           
          debug('[getFileWriteStream] outPath:', outPath);
          return fs.createWriteStream(outPath,{autoClose:true});
      },

      getFileReadStream : function( inPath ){
          debug('[getFileReadStream] inPath:', inPath);
          return fs.createReadStream(inPath);
      },
      // stringify and write out json, this is trrrible but don't have time to
      // deal with it atm, there is a async stringify json lib but it doesent work with
      // async lib or any parallel calls :(
      writeJson : function( jsonOutPath, jsonData,  jsonCb ){

          debug('[writeJson] jsonOutPath:', jsonOutPath);
          fs.writeFile(jsonOutPath, JSON.stringify(jsonData), function(writeErr){

              if(writeErr){
                  return jsonCb(utilsError(writeErr));
              }

              debug('[writeJson]','Json written successfully');
              return jsonCb(null);
          });
      },

      removeDirectory : function( dirFullPath, cb ){

          debug( '[removeDirectory] dirFullPath:', dirFullPath );
          rimraf(dirFullPath, {disableGlob:true}, function(err){
              if(err){
                  return cb(utilsError(err));
              }
              return cb(null);
          }); 
      },

      readDirectory : function(dirFullPath, cb){

          debug( '[readDirectory] dirFullPath:', dirFullPath );
          fs.readdir(dirFullPath, function( readDirErr, files){
              if(readDirErr){
                  return cb(utilsError(readDirErr));
              }
              debug( '[readDirectory]', 'Directory read successfully' );
              return cb(null,files);
          });
      },

      readDirectoryRec : function(topDirPath, cb){

          debug( '[readDirectoryRec] topDirPath:', topDirPath );
          recursiveRead(topDirPath,[".*"], function( recErr, files){
              if(recErr){
                  return cb(utilsError(recErr));
              }
              debug( '[readDirectoryRec]', 'Directory read successfully' );
              return cb(null,files);
          });
      },

      removeFile : function( fileFullPath,  cb ){

          debug( '[removeFile] fileFullPath:', fileFullPath );
          rimraf( fileFullPath, {}, function(err){
              if(err){
                  return cb(utilsError(err));
              }
              return cb(null);
          }); 
      },

      readFileRaw : function(fileFullPath, cb){
          debug( '[readFileRaw] fileFullPath:', fileFullPath );
          fs.readFile(fileFullPath, function( readFileErr, data){
              if(readFileErr){
                  return cb(utilsError(redaFileErr));
              }
              debug( '[readFileRaw]', 'File read successfully' );
              return cb(null,data);
          });
      },

      readFile : function(fileFullPath, cb){
          debug( '[readFile] fileFullPath:', fileFullPath );
          fs.readFile(fileFullPath,'utf8', function( readFileErr, data){
              if(readFileErr){
                  return cb(utilsError(redaFileErr));
              }
              debug( '[readFile]', 'File read successfully' );
              return cb(null,data);
          });
      },

      makeDirectory : function(dirFullPath, cb){
          debug( '[makeDirectory] dirFullPath:', dirFullPath );
          fs.mkdir(dirFullPath, function( mkdirErr ){
              if( mkdirErr && mkdirErr.code !== 'EEXIST' ){
                  return cb(utilsError(mkdirErr));
              }
              debug( '[makeDirectory]', 'Directory created successfully' );
              return cb(null);
          });
      },

      stat : function(dirFullPath, cb){
          debug( '[stat] dirFullPath:', dirFullPath );
          fs.lstat(dirFullPath, function( statErr, stats ){

              if( statErr && statErr.code !== 'ENOENT' ){
                  return cb(utilsError(statErr));
              }

              if( stats && stats.isDirectory() ){
                  return cb(null, { type: 'directory' } );
              } else if( stats && stats.isFile() ){
                  return cb(null, { type: 'file' } );
              }
              return cb(null, null);
          });
      }
    };
};
