/**
 * @file:
 *  batools-auth module  - Sets up Passport auth-stratiegies for
 *                         for use in node middleware
 *
 * @author: Jared Arnold
 * @date:   Mon May 31 2016
 *
 * @module batools-auth
 */

'use strict';
/*
 * Exports the the batools-auth module 
 * @param {Module} passport - Module for initializing Stategies and Working with middleware
 * @param {Function} ActiveDirectoryStrategy - Creates an ActiveDirectory Strategy for passport
 * @param {Functon} BasicStrategy - Creates a Basic Authorization Strategy for passport
 * @returns {batoolsAuth}
 */ 
module.exports  =  function( passport, ActiveDirectoryStrategy, BasicStrategy, debug ){

  //enable debug output
  var bataLog = debug('lib:BATA');

  // private vars
  var session = false;

  return {

    /**
     * Enable batools-auth middleware authorization 
     * @returns {void}
     *
     * @see {@link http://www.npmjs.com/package/passport} for information
     *       on initializing passport within Express 
     *
     * @example
     * //"To use with an Express or Connect-based application"
     * app.use(batoolsAuth.initialize());
     */ 
    initialize : function(){
      return passport.initialize(); 
    },

    /**
     * Enable batools-auth middleware sessions 
     * @returns {void}
     *
     * @see {@link http://www.npmjs.com/package/passport} for information
     *       on initializing passport sessions within Express
     *
     * @example
     * //"To use with an Express or Connect-based application"
     * app.use(batoolsAuth.session());
     */ 
    session : function(){
      session = true;
      return passport.session(); 
    },

    /**
     * Method for serializing users when using sessions 
     * @param {Function} cb - Function that serializes users 
     * @returns {void}
     *
     * @example
     * batoolsAuth.serializeUser(function(user,done){
     *   return done(null,user.id);
     * });
     *
     */ 
    serializeUser : function(cb){
      passport.serializeUser(cb);
    },

    /**
     * Method for deserializing users when using sessions 
     * @param {Function} cb - Function that deserializes
     * @returns {void}
     *
     * @example
     * batoolsAuth.deserializeUser(function(user,id){
     *   db.findById(id,function(err,user){
     *     return done(null,user);
     *   }); 
     * });
     */ 
    deserializeUser : function(cb){
      passport.deserializeUser(cb);
    },

    /**
     * Enable basic authorization
     * @param {Object} configs - Object specifying Basic configs
     * @param {Function} next - Function for verifying users outside of middleware stack
     * @returns {void}
     * @throws Error if User configs are not provided 
     *
     * @example
     * //Outside of Express
     * batoolsAuth.basicAuth(configs,function(err,user){
     *   //verify user obj
     * });
     * 
     * //within Express next will be the next middleware function
     * app.use(batoolsAuth.basicAuth(configs));
     *
     */ 
    //basicAuth : function( configs, next ){
    basicAuth : function( configs, next ){

      if(!configs || 
         !configs.users) {
        throw new Error('Could not find user configurations');
      }

      session = configs.session || session;

      bataLog('[basicAuth] Initializing Basic Auth with session : ' + session);
      bataLog('[basicAuth] Basic Auth configs \n'+JSON.stringify(configs,null,4));

      //makes sure the correct password is supplied 
      passport.use('basic', new BasicStrategy(function validate(username, password, done){
          
          bataLog('[BasicStrategy] Found username: '+ username);
          bataLog('[BasicStrategy] Found password: '+ password);

          var users = configs.users,
              valid = users.hasOwnProperty(username) && users[username].password === password;


          if(valid) {

            bataLog('[BasicStrategy] Validation successful');

            var user = {username: username, roles: users[username].roles};
            return done(null,user);
          }

          bataLog('[BasicStrategy] Validation failed');

          var err = new Error('Basic Authorization Failed');
          err.status = 401;
          return done(err);
      }));

      return passport.authenticate('basic', { session :  session }, next);
    },

    /**
     * Enable Active Directory authorization, The default credentials parser,
     * assumes the credentials are stored in a Basic Authorization Header
     * @param {Object} configs - Object specifying ActiveDirectory configs
     * @param {Function} getCreds - Parses credentials from the request. Leave null for default.
     * @param {Function} next - Function for verifying users outside of middleware stack
     * @returns {void}
     * @throws Error if bindInfo configs are not provided 
     *
     * @example
     * //Outside of Express
     * batoolsAuth.activeDirectoryAuth(configs,function(req,cb){
     *   return cb(null,req.body.username,req.body.password);
     * },function(err,user){
     *   //verify user obj
     * });
     * 
     * //within Express next will be the next middleware function
     * app.use(batoolsAuth.activeDirectoryAuth(configs,function(req,cb){
     *   return cb(null,req.body.username,req.body.password);
     * })); 
     *
     * //use default creds parser
     * app.use(batoolsAuth.activeDirectoryAuth(configs)); 
     *
     */ 
    //activeDirectoryAuth : function( configs, getCreds, next ){
    activeDirectoryAuth : function(  getCreds, next ){

      var LDAP_BIND_URL     = process.env.LDAP_BIND_URL, 
          LDAP_BIND_BASE_DN =  process.env.LDAP_BIND_BASE_DN,
          LDAP_BIND_DN      =  process.env.LDAP_BIND_DN,
          LDAP_BIND_USER    =  process.env.LDAP_BIND_USER,
          LDAP_BIND_PASS    =  process.env.LDAP_BIND_PASS,
          LDAP_OPTS_ATTRS   =  process.env.LDAP_OPTS_ATTRS,
          LDAP_OPTS_BASE_DN = process.env.LDAP_OPTS_BASE_DN,
          LDAP_OPTS_SCOPE   = process.env.LDAP_OPTS_SCOPE;

      var configs = {
        bindInfo: {
          tlsOptions: {}
        },
        options: {}
      };

      if( LDAP_BIND_URL && LDAP_BIND_PASS ){
        configs.bindInfo.url      = LDAP_BIND_URL;
        configs.bindInfo.password = LDAP_BIND_PASS;
      } else {
        throw new Error('Invalid configs while starting active directory, missing bind url,user,pass');
      }

      if( LDAP_BIND_BASE_DN && LDAP_BIND_USER ){
        configs.bindInfo.username = LDAP_BIND_USER;
        configs.bindInfo.baseDN = LDAP_BIND_BASE_DN;
      } else if(LDAP_BIND_DN){
        configs.bindInfo.bindDN = LDAP_BIND_DN;
      } else {
        throw new Error('Invalid configs while starting active directory, missing bind dn or bind base dn');
      }

      //ssl
      configs.bindInfo.tlsOptions.rejectUnauthorized = false;
      configs.bindInfo.tlsOptions.ca = 'N/A';

      // options
      if( LDAP_OPTS_BASE_DN ){
          configs.options.baseDN = LDAP_OPTS_BASE_DN;
      }

      if( LDAP_OPTS_SCOPE ){
          configs.options.scope = LDAP_OPTS_SCOPE;
      }

      if( LDAP_OPTS_ATTRS ){
          configs.options.attributes = LDAP_OPTS_ATTRS;
      }

      session = configs.session || session;

      bataLog('[activeDirectoryAuth] Initializing AD Auth with session : ' + session);

      //init strat 
      passport.use('activedirectory', new ActiveDirectoryStrategy(configs, getCreds));

      return passport.authenticate('activedirectory', { session : session }, next);
    }
  };
};// end module
