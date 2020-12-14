/**
 * @file:
 * ActiveDirectoryStrategy module
 * Initializes a new ActiveDirectoryStrategy for use with passport
 *  
 *
 * @author: Jared Arnold
 * @date:   Mon May 31 2016
 *
 */


/* eslint-disable */
/**
 * Exports the ActiveDirectoryStrategy  module 
 *  
 */ 
/*eslint-enable */
module.exports = function ( passportStrat, util, ActiveDirectory, debug ){
  
  var adsLog = debug('lib:ADS');

  //strategy defaults
      //all the places a username my be
      ATTRIBUTES = ['uid', 'sAMAccountName','cn', 'dn', 'userPrincipalName', 'memberOf'],
      LDAP_ERROR_TABLE = {
            '51f' : 'No logon servers', 
            '525' : 'Invalid user credentials', 
            '52e' : 'Invalid user credentials', 
            '530' : 'User not permitted to logon at this time', 
            '531' : 'User not permitted to logon at this workstation', 
            '532' : 'Password expired', 
            '533' : 'Account disabled', 
            '534' : 'User has not been granted the requested logon type at this machine', 
            '701' : 'Account expired', 
            '773' : 'User must reset password', 
            '775' : 'User Account locked'
        },
        LDAP_ERROR_REGEXP = /data ([0-9e]+)/i,
        GETCREDSBASIC = function(req,callback){

          adsLog('[GETCREDSBASIC] Using default parser');

          var authorization = req.headers.authorization,
               err = new Error('Error parsing basic credentials');
               err.status = 400;

          if(!authorization){
            return callback(err); 
          }

          var parts = authorization.split(' ');
          if(parts.length !== 2){
            return callback(err);
          }

          var scheme = parts[0]
            , credentials = new Buffer(parts[1], 'base64').toString()
            , index = credentials.indexOf(':');

          if('Basic' !== scheme || index < 0){
            return callback(err);
          }

          var user = credentials.slice(0,index)
            , pass = credentials.slice(index+1);

          if( user.length < 1 || pass.length < 1 ){
            return callback(err);
          }

          return callback(null,user,pass);
        };

  //determines the correct error message corresponding to
  // ad error codes 
  function authFail(adErr, msg, status){
    var ldapCode,
        ldapMessage;
    if(adErr && adErr.message){
      try{
        ldapCode = LDAP_ERROR_REGEXP.exec(adErr.message)[1];
        ldapMessage = LDAP_ERROR_TABLE[ldapCode];
      } catch (e){
        adsLog('[authFail] Could not parse ldapCode\n\t' + adErr );
      }
    }
    var error = new Error( ldapMessage || msg || 'Authorization Failure' );
    error.status = error.status || status || 401;
    adsLog('[authFail] ' + error.message);
    return error;
  }

  /**
   * `ActiveDirectoryStrategy` constructor.
   *
   * The Active Directory authentication strategy authenticates requests based
   * on username and password credentials provided in the request.  To provide
   * flexibility in how credentials are provided, the strategy takes callbacks
   * for extracting username and password credentials from a request object.
   *
   * The user object passed to the next middleware includes group/role member
   * information that can also be used for authorization purposes.
   *
   * @param {Object} configs - contains information for connecting to ldap
   *                           as well as options for active directrory finctions
   * @param {Function} getCreds - Tells the stategy how to find the credentials within 
   *                              the request 
   * @api public
   * @returns {undefined} Nothing is returned
   * @ignore
   */
  function ActiveDirectoryStrategy(configs, getCreds) {
     
      passportStrat.Strategy.call(this);
      //set/add defaults here
      this.options = configs.options || {};
      this.options.baseDN = this.options.baseDN || BASEDN;
      this.options.attributes = this.options.attributes || [];

      // currently these need to at least have uid, sAMAccountName, dn and memberOf to
      // work with role matching, user searching, authentication, and to be backwards
      // complatible with the old ab ldap auth
      this.options.attributes = this.options.attributes.concat(ATTRIBUTES);

      //maps roles to ad groups
      this.ad = new ActiveDirectory(configs.bindInfo);
      this.getCredentials = getCreds || GETCREDSBASIC;

      //adsLog('[ActiveDirectoryStrategy] Final AD configs \n' + JSON.stringify(configs,null,4));
      adsLog('[ActiveDirectoryStrategy] URL:', configs.bindInfo.url);
      adsLog('[ActiveDirectoryStrategy] BIND_DN:', configs.bindInfo.bindDN);
      adsLog('[ActiveDirectoryStrategy] Option BASE_DN:', configs.options.baseDN);
      adsLog('[ActiveDirectoryStrategy] Option ATTRIBUTES:', JSON.stringify(configs.options.attributes,null,4));
  }

  /**
   * Inherit from `passport.Strategy`.
   */
  util.inherits(ActiveDirectoryStrategy, passportStrat.Strategy);
  
  
  /**
   * Implements an active directory stategy currently
   * finds users then authenticates there credentials
   * if all checks out the info is bound to the request object
   * for further verification
   * @param {Object} req Request object
   * @api protected
   * @returns {void}
   * @ignore
   */
  ActiveDirectoryStrategy.prototype.authenticate = function(req) {

    var strategy = this; 
    //retrieves and parses creds
    strategy.getCredentials(req,function(parseErr, username, password){

      if(parseErr){
        //creds parsing error
        adsLog('[getCredentialsCB] ' + parseErr.message);
        return strategy.error(parseErr);
      }
       
      adsLog('[getCredentialsCB] Found username : ' + username);

      //apply filter
      //search all possible user_attrs, sea=>uid, ab=>sAMAccountName
      strategy.options.filter = '(|(sAMAccountName=' + username + ')' +
                                  '(uid=' + username + ')' +
                                  '(cn=' + username + ')' +
                                  '(dn=' + username + ')' +
                                  '(userPrincipalName=' + username + '))';

      // finds the user
      strategy.ad.findUser(
          strategy.options,
          username,
          function(findErr, user) {

              if (!findErr && user) {

                  adsLog('[findUserCB] Found user \n' + JSON.stringify(user,null,4));

                  strategy.ad.authenticate(user.dn, password, function(authErr, auth) {
                      if (!authErr && auth) {

                          adsLog('[authenticateCB] Authorization successful');

                          return strategy.success(user);
                      }
                      return strategy.error( authFail(authErr,'Invalid user credentials') );
                  });
              }
              else {
                return strategy.error( authFail(findErr,'User not Found') );
            }
         }
      );
    });
  };

  return ActiveDirectoryStrategy;
};

