/**
 * Deals with user registration/authentication
 * @class DL.Auth
 * @param {DL.Client} client
 * @constructor
 */
DL.Auth = function(client) {
  this.client = client;

  // Get current user reference
  this.currentUser = window.localStorage.getItem(this.client.appId + '-' + DL.Auth.AUTH_DATA_KEY);
  if (this.currentUser) {
    this.currentUser = JSON.parse(this.currentUser); // localStorage only supports recording strings, so we need to parse it
  }
};

// Constants
DL.Auth.AUTH_TOKEN_KEY = 'dl-api-auth-token';
DL.Auth.AUTH_DATA_KEY = 'dl-api-auth-data';

/**
 * @method logout
 * @return {DL.Auth} this
 */
DL.Auth.prototype.logout = function() {
  this.currentUser = null;
  window.localStorage.removeItem(this.client.appId + '-' + DL.Auth.AUTH_TOKEN_KEY);
  window.localStorage.removeItem(this.client.appId + '-' + DL.Auth.AUTH_DATA_KEY);
  return this;
};

/**
 * Register user using current authentication provider.
 *
 * @param {String} provider
 * @param {Object} data
 * @method register
 *
 * @example Authenticating with email address
 *
 *     client.auth.register('email', {
 *       email: "daliberti@doubleleft.com",
 *       name: "Danilo Aliberti",
 *       password: "123"
 *     }).then(function(user) {
 *       console.log("Registered user: ", user);
 *     });
 *
 * @example Authenticating with Facebook
 *
 *     FB.login(function(response) {
 *       client.auth.register('facebook', response.authResponse).then(function(user) {
 *         console.log("Registered user: ", user);
 *       });
 *     }, {scope: 'email'});
 *
 *
 */
DL.Auth.prototype.register = function(provider, data) {
  var promise, that = this;
  if (typeof(data)==="undefined") { data = {}; }

  promise = this.client.post('auth/' + provider, data);
  promise.then(function(data) {
    that.registerToken(data);
  });
  return promise;
};

DL.Auth.prototype.check = function(provider, data) {
  if (typeof(data)==="undefined") {
    data = {};
  }
  return this.client.get('auth/' + provider, data);
};

DL.Auth.prototype.registerToken = function(data) {
  if (data.token) {
    // register authentication token on localStorage
    window.localStorage.setItem(this.client.appId + '-' + DL.Auth.AUTH_TOKEN_KEY, data.token.token);
    delete data.token;

    // Store curent user
    this.currentUser = data;
    window.localStorage.setItem(this.client.appId + '-' + DL.Auth.AUTH_DATA_KEY, JSON.stringify(this.currentUser));
  }
};
