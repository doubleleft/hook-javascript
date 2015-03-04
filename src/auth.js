/**
 * Deals with user registration/authentication
 * @module Hook
 * @class Hook.Auth
 * @extends Hook.Events
 * @param {Hook.Client} client
 * @constructor
 */
Hook.Auth = function(client) {
  this.client = client;

  /**
   * @property currentUser
   * @type {Object}
   */
  this.currentUser = null;

  var now = new Date(),
      tokenExpiration = new Date(window.localStorage.getItem(this.client.app_id + '-' + Hook.Auth.AUTH_TOKEN_EXPIRATION)),
      currentUser = window.localStorage.getItem(this.client.app_id + '-' + Hook.Auth.AUTH_DATA_KEY);

  // Fill current user only when it isn't expired yet.
  if (currentUser && now.getTime() < tokenExpiration.getTime()) {
    this.currentUser = JSON.parse(currentUser); // localStorage only supports recording strings, so we need to parse it
  }
};

// Inherits from Events
Hook.Auth.prototype = new Hook.Events();
Hook.Auth.prototype.constructor = Hook.Auth;

// Constants
Hook.Auth.AUTH_DATA_KEY = 'hook-auth-data';
Hook.Auth.AUTH_TOKEN_KEY = 'hook-auth-token';
Hook.Auth.AUTH_TOKEN_EXPIRATION = 'hook-auth-token-expiration';

/**
 * @method setUserData
 * @param {Object} data
 * @return {Hook.Auth} this
 */
Hook.Auth.prototype.setCurrentUser = function(data) {
  if (!data) {
    // trigger logout event
    this.trigger('logout', this.currentUser);
    this.currentUser = data;

    window.localStorage.removeItem(this.client.app_id + '-' + Hook.Auth.AUTH_TOKEN_KEY);
    window.localStorage.removeItem(this.client.app_id + '-' + Hook.Auth.AUTH_DATA_KEY);
  } else {
    window.localStorage.setItem(this.client.app_id + '-' + Hook.Auth.AUTH_DATA_KEY, JSON.stringify(data));

    // trigger login event
    this.currentUser = data;
    this.trigger('login', data);
  }

  return this;
};

/**
 * Register a user.
 * @param {Object} data
 * @method register
 *
 * @example Register with email address
 *
 *     client.auth.register({
 *       email: "endel@doubleleft.com",
 *       password: "12345",
 *       name: "Endel Dreyer"
 *     }).then(function(user) {
 *       console.log("Registered user: ", user);
 *     });
 *
 */
Hook.Auth.prototype.register = function(data) {
  var promise, that = this;
  if (typeof(data)==="undefined") { data = {}; }
  promise = this.client.post('auth/email', data);
  promise.then(function(data) {
    that._registerToken(data);
  });
  return promise;
};

/**
 * Verify if user is already registered, and log-in if succeed.
 * @method login
 * @param {Object} data
 * @return {Promise}
 *
 * @example
 *
 *     client.auth.login({email: "edreyer@doubleleft.com", password: "123"}).then(function(data){
 *       console.log("User found: ", data);
 *     }, function(data){
 *       console.log("User not found or password invalid.", data);
 *     });
 */
Hook.Auth.prototype.login = function(data) {
  var promise, that = this;
  if (typeof(data)==="undefined") { data = {}; }
  promise = this.client.post('auth/email/login', data);
  promise.then(function(data) {
    that._registerToken(data);
  });
  return promise;
};

/**
 * Update current user info.
 *
 * @method update
 * @param {Object} data
 * @return {Promise}
 *
 * @example
 *
 *     client.auth.update({ score: 100 }).then(function(data){
 *       console.log("updated successfully: ", data);
 *     }).otherwise(function(data){
 *       console.log("error: ", data);
 *     });
 */
Hook.Auth.prototype.update = function(data) {
  if (!this.currentUser) {
    throw new Error("not logged in.");
  }

  var that = this;
  var promise = this.client.post('auth/update', data);

  // update localStorage info
  promise.then(function(data) { that.setCurrentUser(data); });

  return promise;
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
Hook.Auth.prototype.forgotPassword = function(data) {
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
Hook.Auth.prototype.resetPassword = function(data) {
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
 * @return {Hook.Auth} this
 */
Hook.Auth.prototype.logout = function() {
  return this.setCurrentUser(null);
};

/**
 * @method getToken
 * @return {String|null}
 */
Hook.Auth.prototype.getToken = function() {
  return window.localStorage.getItem(this.client.app_id + '-' + Hook.Auth.AUTH_TOKEN_KEY);
};

Hook.Auth.prototype._registerToken = function(data) {
  if (data.token) {
    // register authentication token on localStorage
    window.localStorage.setItem(this.client.app_id + '-' + Hook.Auth.AUTH_TOKEN_KEY, data.token.token);
    window.localStorage.setItem(this.client.app_id + '-' + Hook.Auth.AUTH_TOKEN_EXPIRATION, data.token.expire_at);
    delete data.token;

    // Store curent user
    this.setCurrentUser(data);
  }
};
