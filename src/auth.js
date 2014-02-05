/**
 * @class DL.Auth
 *
 * @param {DL.Client} client
 * @param {String} provider
 *
 * @constructor
 */
DL.Auth = function(client, provider) {
  this.client = client;
  this.provider = provider;
  this.segments = 'auth/' + this.provider;
 };

// Constants
DL.Auth.AUTH_TOKEN_KEY = 'dl-api-auth-token';

/**
 * @method logout
 * @return {DL.Auth} this
 */
DL.Auth.prototype.logout = function() {
  window.localStorage.removeItem(this.client.appId + '-' + DL.Auth.AUTH_TOKEN_KEY);
  return this;
};

/**
 * Register user using current authentication provider.
 *
 * @param {Object} providerData
 * @method register
 *
 * @example Authenticating with email address
 *
 *     client.auth('email').register({
 *       email: "daliberti@doubleleft.com",
 *       name: "Danilo Aliberti",
 *       password: "123"
 *     }).then(function(user) {
 *       console.log("Registered user: ", user);
 *     });
 *
 * @example Authenticating with Facebook
 *
 *     FB.getLoginStatus(function(response) {
 *       if (response.status === 'connected') {
 *
 *         client.auth('facebook').register(response.authResponse).then(function(user) {
 *           console.log("Registered user: ", user);
 *         });
 *
 *       } else if (response.status === 'not_authorized') {
 *         console.log("the user is logged in to Facebook, but has not authenticated your app");
 *       } else {
 *         console.log("the user isn't logged in to Facebook.")
 *       }
 *     });
 *
 *
 */
DL.Auth.prototype.register = function(providerData) {
  var promise;
  if (typeof(providerData)==="undefined") {
    providerData = {};
  }
  promise = this.client.post(this.segments, providerData);
  promise.then(this.registerToken);
  return promise;
};

DL.Auth.prototype.check = function(providerData) {
  if (typeof(providerData)==="undefined") {
    providerData = {};
  }
  return this.client.get(this.segments, providerData);
};

DL.Auth.prototype.registerToken = function(data) {
  if (data.token) {
    // register authentication token on localStorage
    window.localStorage.setItem(this.client.appId + '-' + DL.Auth.AUTH_TOKEN_KEY, data.token.token);
  }
};
