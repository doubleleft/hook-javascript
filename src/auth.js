/**
 * Deals with user registration/authentication
 * @module DL
 * @class DL.Auth
 * @extends DL.Events
 * @param {DL.Client} client
 * @constructor
 */
DL.Auth = function(client) {
  this.client = client;

  /**
   * @property currentUser
   * @type {Object}
   */
  this.currentUser = null;

  var now = new Date(),
      tokenExpiration = new Date(parseInt((window.localStorage.getItem(this.client.appId + '-' + DL.Auth.AUTH_TOKEN_EXPIRATION)) || 0, 10) * 1000),
      currentUser = window.localStorage.getItem(this.client.appId + '-' + DL.Auth.AUTH_DATA_KEY);

  // Fill current user only when it isn't expired yet.
  if (currentUser && now.getTime() < tokenExpiration.getTime()) {
    this.currentUser = JSON.parse(currentUser); // localStorage only supports recording strings, so we need to parse it
  }
};

// Inherits from Events
DL.Auth.prototype = new DL.Events();
DL.Auth.prototype.constructor = DL.Auth;

// Constants
DL.Auth.AUTH_DATA_KEY = 'dl-api-auth-data';
DL.Auth.AUTH_TOKEN_KEY = 'dl-api-auth-token';
DL.Auth.AUTH_TOKEN_EXPIRATION = 'dl-api-auth-token-expiration';

/**
 * @method setUserData
 * @param {Object} data
 * @return {DL.Auth} this
 */
DL.Auth.prototype.setCurrentUser = function(data) {
  if (!data) {
    // trigger logout event
    this.trigger('logged_out', this.currentUser);
    this.currentUser = data;

    window.localStorage.removeItem(this.client.appId + '-' + DL.Auth.AUTH_TOKEN_KEY);
    window.localStorage.removeItem(this.client.appId + '-' + DL.Auth.AUTH_DATA_KEY);
  } else {
    window.localStorage.setItem(this.client.appId + '-' + DL.Auth.AUTH_DATA_KEY, JSON.stringify(data));

    // trigger login event
    this.currentUser = data;
    this.trigger('logged_in', data);
  }

  return this;
};

/**
 * Register user using current authentication provider.
 * @param {String} provider
 * @param {Object} data
 * @method register
 *
 * @example Register with email address
 *
 *     client.auth.register('email', {
 *       email: "daliberti@doubleleft.com",
 *       name: "Danilo Aliberti",
 *       password: "123"
 *     }).then(function(user) {
 *       console.log("Registered user: ", user);
 *     });
 *
 * @example Register with Facebook
 *
 *     FB.login(function(response) {
 *       client.auth.register('facebook', response.authResponse).then(function(user) {
 *         console.log("Registered user: ", user);
 *       });
 *     }, {scope: 'email'});
 *
 */
DL.Auth.prototype.register = function(provider, data) {
  var promise, that = this;
  if (typeof(data)==="undefined") { data = {}; }
  promise = this.client.post('auth/' + provider, data);
  promise.then(function(data) {
    that._registerToken(data);
  });
  return promise;
};

/**
 * @method authenticate
 * @see register
 */
DL.Auth.prototype.authenticate = function() {
  console.log("auth.authenticate method is deprecated. Please use auth.register.");
  return this.register.apply(this, arguments);
};

/**
 * Verify if user is already registered, and log-in if succeed.
 * @method login
 * @param {String} provider
 * @param {Object} data
 * @return {Promise}
 *
 * @example
 *
 *     client.auth.login('email', {email: "edreyer@doubleleft.com", password: "123"}).then(function(data){
 *       console.log("User found: ", data);
 *     }, function(data){
 *       console.log("User not found or password invalid.", data);
 *     });
 *
 * Verify if user is already registered, and log-in if succeed.
 */
DL.Auth.prototype.login = function(provider, data) {
  var promise, that = this;
  if (typeof(data)==="undefined") { data = {}; }
  promise = this.client.post('auth/' + provider + '/verify', data);
  promise.then(function(data) {
    that._registerToken(data);
  });
  return promise;
};

/**
 * @method verify
 * @see login
 */
DL.Auth.prototype.verify = function() {
  console.log("auth.verify method is deprecated. Please use auth.login.");
  return this.login.apply(this, arguments);
};

/**
 * Send a 'forgot password' confirmation email to target user email address.
 * @method forgotPassword
 * @param {Object} data
 * @return {Promise}
 *
 * @example
 *
 *     client.auth.forgotPassword({
 *       email: "edreyer@doubleleft.com",
 *       subject: "Project name: Forgot your password?",
 *       template: "Hi {{name}}, click here to reset your password http://custom-project.com/pass-recovery-path.html?token={{token}}"
 *     }).then(function(data){
 *       console.log("Email enviado!", data);
 *     }, function(data){
 *       console.log("User not found: ", data);
 *     });
 */
DL.Auth.prototype.forgotPassword = function(data) {
  if (typeof(data)==="undefined") { data = {}; }
  return this.client.post('auth/email/forgotPassword', data);
};

/**
 * Reset user password
 * @method resetPassword
 * @param {Object} data
 *   @param {Object} data.password
 *   @param {Object} data.token [optional]
 * @return {Promise}
 *
 * @example Getting token automatically from query string
 *
 *     client.auth.resetPassword("my-new-password-123").then(function(data){
 *       console.log("Password reseted! ", data);
 *     }, function(data){
 *       console.log("Error", data.error);
 *     });
 *
 * @example Providing a token manually
 *
 *     client.auth.resetPassword({token: "xxx", password: "my-new-password-123"}).then(function(data){
 *       console.log("Password reseted! ", data);
 *     }, function(data){
 *       console.log("Error", data.error);
 *     });
 *
 */
DL.Auth.prototype.resetPassword = function(data) {
  if (typeof(data)==="string") { data = { password: data }; }
  if (typeof(data.token)==="undefined") {
    data.token = window.location.href.match(/[\?|&]token=([a-z0-9]+)/);
    data.token = (data.token && data.token[1]);
  }
  if (typeof(data.token)!=="string") { throw new Error("forgot password token required. Remember to use 'auth.forgotPassword' before 'auth.resetPassword'."); }
  if (typeof(data.password)!=="string") { throw new Error("new password required."); }
  return this.client.post('auth/email/resetPassword', data);
};

/**
 * @method logout
 * @return {DL.Auth} this
 */
DL.Auth.prototype.logout = function() {
  return this.setCurrentUser(null);
};

/**
 * @method getToken
 * @return {String|null}
 */
DL.Auth.prototype.getToken = function() {
  return window.localStorage.getItem(this.client.appId + '-' + DL.Auth.AUTH_TOKEN_KEY);
};

DL.Auth.prototype._registerToken = function(data) {
  if (data.token) {
    // register authentication token on localStorage
    window.localStorage.setItem(this.client.appId + '-' + DL.Auth.AUTH_TOKEN_KEY, data.token.token);
    window.localStorage.setItem(this.client.appId + '-' + DL.Auth.AUTH_TOKEN_EXPIRATION, data.token.expire_at);
    delete data.token;

    // Store curent user
    this.setCurrentUser(data);
  }
};
