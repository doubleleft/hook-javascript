/*
 * hook-javascript v0.1.0
 * https://github.com/doubleleft/hook-javascript
 *
 * @copyright 2014 Doubleleft
 * @build 10/3/2014
 */
(function(window) {
  //
  // compatibility with amd
  // WARNING: i'm fucking weird, please fix me
  //
  if (typeof(window.define)==="undefined") {
    window.define = function(factory, func) {
      try{ delete window.define; } catch(e){ window.define = void 0; } // IE

      if (typeof(factory)==="function") {
        // whenjs
        window.when = factory();
      } else {
        window[factory] = func();
      }
    };
    window.define.amd = {};
  }

/**
 * @module Hook
 */
var Hook = {
  VERSION: "0.1.0",
  defaults: {
    perPage: 50
  }
};

window.Hook = Hook;

/**
 * Hook.Client is the entry-point for using dl-api.
 *
 * You should instantiate a global javascript client for consuming dl-api.
 *
 * ```javascript
 * window.dl = new Hook.Client({
 *   url: "http://local-or-remote-dl-api-address.com/api/public/index.php/",
 *   app_id: 1,   // your app's id
 *   key: 'test'  // your app's public key
 * });
 * ```
 *
 * @module Hook
 * @class Hook.Client
 *
 * @param {Object} options
 *   @param {String} options.app_id
 *   @param {String} options.key
 *   @param {String} options.url default: http://hook.dev
 *
 * @constructor
 */

Hook.Client = function(options) {
  if (!options) { options = {}; }
  this.url = options.endpoint || options.url || window.location.origin;
  this.app_id = options.app_id || options.appId || "";
  this.key = options.key || "";

  // append last slash if doesn't have it
  if (this.url.lastIndexOf('/') != this.url.length - 1) {
    this.url += "/";
  }

  /**
   * @property {Hook.KeyValues} keys
   */
  this.keys = new Hook.KeyValues(this);

  /**
   * @property {Hook.Auth} auth
   */
  this.auth = new Hook.Auth(this);

  /**
   * @property {Hook.System} system
   */
  this.system = new Hook.System(this);

  // Setup all registered plugins.
  Hook.Plugin.Manager.setup(this);
};

/**
 * Get collection instance.
 * @method collection
 * @param {String} collectionName
 * @return {Hook.Collection}
 *
 * @example Retrieve a collection reference. Your collection tables are created on demand.
 *
 *     // Users collection
 *     var users = client.collection('users');
 *
 *     // Highscores
 *     var highscores = client.collection('highscores');
 *
 */
Hook.Client.prototype.collection = function(collectionName) {
  return new Hook.Collection(this, collectionName);
};

/**
 * Get channel instance.
 * @method channel
 * @param {String} name
 * @param {Object} options (optional)
 * @return {Hook.Channel}
 *
 * @example Create a channel using Servet-Sent Events transport.
 *
 *     var channel = client.channel('messages');
 *
 * @example Create a channel using WebSockets transport.
 *
 *     var channel = client.channel('messages', { transport: "websockets" });
 *
 */
Hook.Client.prototype.channel = function(name, options) {
  if (typeof(options)==="undefined") { options = {}; }

  var collection = this.collection(name);
  collection.segments = collection.segments.replace('collection/', 'channels/');

  // Use 'SSE' as default transport layer
  if (!options.transport) { options.transport = 'sse'; }
  options.transport = options.transport.toUpperCase();

  return new Hook.Channel[options.transport](this, collection, options);
};

/**
 * Create resource
 * @method post
 * @param {String} segments
 * @param {Object} data
 */
Hook.Client.prototype.post = function(segments, data) {
  if (typeof(data)==="undefined") {
    data = {};
  }
  return this.request(segments, "POST", data);
};

/**
 * Retrieve a resource
 * @method get
 * @param {String} segments
 * @param {Object} data
 */
Hook.Client.prototype.get = function(segments, data) {
  return this.request(segments, "GET", data);
};

/**
 * Update existing resource
 * @method put
 * @param {String} segments
 * @param {Object} data
 */
Hook.Client.prototype.put = function(segments, data) {
  return this.request(segments, "PUT", data);
};

/**
 * Delete existing resource.
 * @method delete
 * @param {String} segments
 */
Hook.Client.prototype.remove = function(segments, data) {
  return this.request(segments, "DELETE", data);
};

/**
 * @method request
 * @param {String} segments
 * @param {String} method
 * @param {Object} data
 */
Hook.Client.prototype.request = function(segments, method, data) {
  var payload, request_headers, deferred = when.defer(),
      synchronous = false;

  // FIXME: find a better way to write this
  if (data && data._sync) {
    delete data._sync;
    synchronous = true;
  }

  // Compute payload
  payload = this.getPayload(method, data);

  // Compute request headers
  request_headers = this.getHeaders();
  if (!(payload instanceof FormData)){
    request_headers["Content-Type"] = 'application/json'; // exchange data via JSON to keep basic data types
  }

  if (typeof(XDomainRequest) !== "undefined") {
    // XMLHttpRequest#setRequestHeader isn't implemented on Internet Explorer's XDomainRequest
    segments += "?X-App-Id=" + this.app_id + "&X-App-Key=" + this.key;
    var auth_token = this.auth.getToken();
    if (auth_token) { segments += '&X-Auth-Token=' + auth_token; }
  }

  deferred.promise.xhr = uxhr(this.url + segments, payload, {
    method: method,
    headers: request_headers,
    sync: synchronous,
    success: function(response) {
      var data = null;
      try {
        data = JSON.parseWithDate(response);
      } catch(e) { }

      if (data === false || data === null || data.error) {
        // log error on console
        if (data && data.error) { console.error(data.error); }
        deferred.resolver.reject(data);
      } else {
        deferred.resolver.resolve(data);
      }
    },
    error: function(response) {
      var data = null;
      try {
        data = JSON.parseWithDate(response);
      } catch(e) { }
      console.log("Error: ", data || "Invalid JSON response.");
      deferred.resolver.reject(data);
    }
  });

  return deferred.promise;
};

/**
 * Get XHR headers for app/auth context.
 * @method getHeaders
 * @return {Object}
 */
Hook.Client.prototype.getHeaders = function() {
  // App authentication request headers
  var request_headers = {
    'X-App-Id': this.app_id,
    'X-App-Key': this.key,
  }, auth_token;

  // Forward user authentication token, if it is set
  var auth_token = this.auth.getToken();
  if (auth_token) {
    request_headers['X-Auth-Token'] = auth_token;
  }
  return request_headers;
}

/**
 * Get payload of given data
 * @method getPayload
 * @param {String} requestMethod
 * @param {Object} data
 * @return {String|FormData}
 */
Hook.Client.prototype.getPayload = function(method, data) {
  var payload = null;
  if (data) {

    if (data instanceof FormData){
      payload = data;
    } else if (method !== "GET") {
      var field, value, filename,
          formdata = new FormData(),
          worth = false;

      for (field in data) {
        value = data[field];
        filename = null;

        if (typeof(value)==='undefined' || value === null) {
          continue;

        } else if (typeof(value)==='boolean' || typeof(value)==='number' || typeof(value)==="string") {
          value = value.toString();

        // IE8 can't compare instanceof String with HTMLInputElement.
        } else if (value instanceof HTMLInputElement && value.files && value.files.length > 0) {
          filename = value.files[0].name;
          value = value.files[0];
          worth = true;

        } else if (value instanceof HTMLInputElement) {
          value = value.value;

        } else if (value instanceof HTMLCanvasElement) {
          value = dataURLtoBlob(value.toDataURL());
          worth = true;
          filename = 'canvas.png';

        } else if (typeof(Blob) !== "undefined" && value instanceof Blob) {
          worth = true;
          filename = 'blob.' + value.type.match(/\/(.*)/)[1]; // get extension from blob mime/type
        }

        //
        // Consider serialization to keep data types here: http://phpjs.org/functions/serialize/
        //
        if (!(value instanceof Array)) { // fixme
          if (typeof(value)==="string") {
            formdata.append(field, value);
          } else {
            formdata.append(field, value, filename || "file");
          }
        }
      }

      if (worth) {
        payload = formdata;
      }
    }

    payload = payload || JSON.stringify(data, function(key, value) {
      if (this[key] instanceof Date) {
        return Math.round(this[key].getTime() / 1000);
      } else {
        return value;
      }
    });

    // empty payload, return null.
    if (payload == "{}") { return null; }

    if (method==="GET" && typeof(payload)==="string") {
      payload = encodeURIComponent(payload);
    }
  }
  return payload;
}

Hook.Client.prototype.serialize = function(obj, prefix) {
  var str = [];
  for (var p in obj) {
    if (obj.hasOwnProperty(p)) {
      var k = prefix ? prefix + "[" + p + "]" : p,
      v = obj[p];
      str.push(typeof v == "object" ? this.serialize(v, k) : encodeURIComponent(k) + "=" + encodeURIComponent(v));
    }
  }
  return str.join("&");
};

/**
 * @class Hook.Events
 */
Hook.Events = function() {
  this._events = {};
};

Hook.Events.prototype.on = function(event, callback, context) {
  if (!this._events[event]) { this._events[event] = []; }
  this._events[event].push({callback: callback, context: context || this});
};

Hook.Events.prototype.trigger = function(event, data) {
  var c, args = Array.prototype.slice.call(arguments,1);
  if (this._events[event]) {
    for (var i=0,length=this._events[event].length;i<length;i++)  {
      c = this._events[event][i];
      c.callback.apply(c.context || this.client, args);
    }
  }
};

/**
 * Iterable is for internal use only.
 * @module Hook
 * @class Hook.Iterable
 */
Hook.Iterable = function() { };
Hook.Iterable.prototype = {
  /**
   * @method each
   * @param {Function} func
   * @return {Promise}
   */
  each : function(func) { return this._iterate('each', func); },

  /**
   * @method find
   * @param {Function} func
   * @return {Promise}
   */
  find : function(func) { return this._iterate('find', func); },

  /**
   * @method filter
   * @param {Function} func
   * @return {Promise}
   */
  filter : function(func) { return this._iterate('filter', func); },

  /**
   * @method max
   * @param {Function} func
   * @return {Promise}
   */
  max : function(func) { return this._iterate('max', func); },

  /**
   * @method min
   * @param {Function} func
   * @return {Promise}
   */
  min : function(func) { return this._iterate('min', func); },

  /**
   * @method every
   * @param {Function} func
   * @return {Promise}
   */
  every : function(func, accumulator) { return this._iterate('every', func); },

  /**
   * @method reject
   * @param {Function} func
   * @return {Promise}
   */
  reject : function(func, accumulator) { return this._iterate('reject', func, accumulator); },

  /**
   * @method groupBy
   * @param {Function} func
   * @return {Promise}
   */
  groupBy : function(func, accumulator) { return this._iterate('groupBy', func, accumulator); },

  /**
   * Iterate using lodash function
   * @method _iterate
   * @param {String} method
   * @param {Function} func
   * @param {Object} argument
   * @return {Promise}
   */
  _iterate : function(method, func, arg3) {
    var that = this, deferred = when.defer();

    this.then(function(data) {
      var result = _[method].call(_, data, func, arg3);
      deferred.resolver.resolve(result);
    }).otherwise(function(err) {
      deferred.resolver.reject(err);
    });

    return deferred.promise;
  }
};

// IE9<: prevent crash when FormData isn't defined.
if(typeof(window.FormData)==="undefined"){
  window.FormData = function(){ this.append=function(){}; };
}

// Support location.origin
if (!window.location.origin) {
  window.location.origin = window.location.protocol + "//" + window.location.hostname + (window.location.port ? ':' + window.location.port: '');
}

/**
 * @module Hook
 * @class Hook.PluginManager
 * @constructor
 * @static
 */
Hook.Plugin = {};
Hook.Plugin.Manager = { plugins: [] };

/**
 * Register plugin to be instantiated on Hook.Client
 * @method register
 * @param {Object} class
 * @static
 */
Hook.Plugin.Manager.register = function(path, klass) {
  this.plugins.push({ path: path, klass: klass });
};

/**
 * Register all plugins on target Hook.Client
 * @method setup
 * @param {Hook.Client} client
 * @static
 */
Hook.Plugin.Manager.setup = function(client) {
  for (var i=0, l = this.plugins.length; i < l; i++) {
    client[ this.plugins[i].path ] = new this.plugins[i].klass(client);
  }
};

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
      tokenExpiration = new Date(window.localStorage.getItem(this.client.appId + '-' + Hook.Auth.AUTH_TOKEN_EXPIRATION)),
      currentUser = window.localStorage.getItem(this.client.appId + '-' + Hook.Auth.AUTH_DATA_KEY);

  // Fill current user only when it isn't expired yet.
  if (currentUser && now.getTime() < tokenExpiration.getTime()) {
    this.currentUser = JSON.parse(currentUser); // localStorage only supports recording strings, so we need to parse it
  }
};

// Inherits from Events
Hook.Auth.prototype = new Hook.Events();
Hook.Auth.prototype.constructor = Hook.Auth;

// Constants
Hook.Auth.AUTH_DATA_KEY = 'dl-api-auth-data';
Hook.Auth.AUTH_TOKEN_KEY = 'dl-api-auth-token';
Hook.Auth.AUTH_TOKEN_EXPIRATION = 'dl-api-auth-token-expiration';

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

    window.localStorage.removeItem(this.client.appId + '-' + Hook.Auth.AUTH_TOKEN_KEY);
    window.localStorage.removeItem(this.client.appId + '-' + Hook.Auth.AUTH_DATA_KEY);
  } else {
    window.localStorage.setItem(this.client.appId + '-' + Hook.Auth.AUTH_DATA_KEY, JSON.stringify(data));

    // trigger login event
    this.currentUser = data;
    this.trigger('login', data);
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
Hook.Auth.prototype.register = function(provider, data) {
  var promise, that = this;
  if (typeof(data)==="undefined") { data = {}; }
  promise = this.client.post('auth/' + provider, data);
  promise.then(function(data) {
    that._registerToken(data);
  });
  return promise;
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
 */
Hook.Auth.prototype.login = function(provider, data) {
  var promise, that = this;
  if (typeof(data)==="undefined") { data = {}; }
  promise = this.client.post('auth/' + provider + '/login', data);
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
  var promise = this.client.collection('auth').update(this.currentUser._id, data);

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
  return window.localStorage.getItem(this.client.appId + '-' + Hook.Auth.AUTH_TOKEN_KEY);
};

Hook.Auth.prototype._registerToken = function(data) {
  if (data.token) {
    // register authentication token on localStorage
    window.localStorage.setItem(this.client.appId + '-' + Hook.Auth.AUTH_TOKEN_KEY, data.token.token);
    window.localStorage.setItem(this.client.appId + '-' + Hook.Auth.AUTH_TOKEN_EXPIRATION, data.token.expire_at);
    delete data.token;

    // Store curent user
    this.setCurrentUser(data);
  }
};

/**
 * Channel implementations
 */
Hook.Channel = {};

// Hook.Channel.Example = function(client, collection, options) {
// };

// Hook.Channel.Example.prototype.subscribe = function(event, callback) {
// };

// Hook.Channel.Example.prototype.isConnected = function() {
// };

// Hook.Channel.Example.prototype.unsubscribe = function(event) {
// };

// Hook.Channel.Example.prototype.publish = function(event, message) {
// };

// Hook.Channel.Example.prototype.disconnect = function(sync) {
// };

/**
 * @module Hook
 * @class Hook.Collection
 *
 * @param {Hook.Client} client
 * @param {String} name
 * @constructor
 */
Hook.Collection = function(client, name) {
  this.client = client;

  this.name = this._validateName(name);
  this.reset();

  this.segments = 'collection/' + this.name;
};

// Inherits from Hook.Iterable
Hook.Collection.prototype = new Hook.Iterable();
Hook.Collection.prototype.constructor = Hook.Collection;

/**
 * Create a new resource
 * @method create
 * @param {Object} data
 * @return {Hook.Collection} this
 *
 * @example Creating an entry
 *
 *     client.collection('posts').create({
 *       title: "Post name",
 *       summary: "My awesome new post",
 *       stars: 5
 *     });
 *
 * @example Listening to complete event
 *
 *     // Verbose way
 *     var c = client.collection('posts');
 *     var promise = c.create({ title: "Post name", summary: "Something", stars: 5 });
 *     promise.then(function(data) {
 *         console.log(data);
 *     });
 *
 *     // Short way
 *     client.collection('posts').create({ title: "Post name", summary: "Something", stars: 5 }).then(function(data) {
 *         console.log(data);
 *     });
 *
 */
Hook.Collection.prototype.create = function(data) {
  return this.client.post(this.segments, data);
};

/**
 * Fields that should be retrieved from the database
 * @method select
 * @return {Hook.Collection} this
 */
Hook.Collection.prototype.select = function() {
  this.options.select = arguments;
  return this;
};

/**
 * Get collection data, based on `where` params.
 * @method get
 * @return {Hook.Collection} this
 */
Hook.Collection.prototype.get = function() {
  return this.client.get(this.segments, this.buildQuery());
};

/**
 * Add `where` param
 * @method where
 * @param {Object | String} where params or field name
 * @param {String} operation '<', '<=', '>', '>=', '!=', 'in', 'between', 'not_in', 'not_between', 'like', 'not_null'
 * @param {String} value value
 * @return {Hook.Collection} this
 *
 * @example Multiple 'where' calls
 *
 *     var c = client.collection('posts');
 *     c.where('author','Vicente'); // equal operator may be omitted
 *     c.where('stars','>',10);     // support '<' and '>' operators
 *     c.then(function(result) {
 *       console.log(result);
 *     });
 *
 * @example One 'where' call
 *
 *     client.collection('posts').where({
 *       author: 'Vicente',
 *       stars: ['>', 10]
 *     }).then(function(result) {
 *       console.log(result);
 *     })
 *
 * @example Filtering 'in' value list.
 *
 *     client.collection('posts').where('author_id', 'in', [500, 501]).then(function(result) {
 *       console.log(result);
 *     })
 *
 * @example Partial String matching
 *
 *     client.collection('posts').where('author', 'like', '%Silva%').then(function(result) {
 *       console.log(result);
 *     })
 *
 */
Hook.Collection.prototype.where = function(objects, _operation, _value, _boolean) {
  var field,
      operation = (typeof(_value)==="undefined") ? '=' : _operation,
      value = (typeof(_value)==="undefined") ? _operation : _value,
      boolean = (typeof(_boolean)==="undefined") ? 'and' : _boolean;

  if (typeof(objects)==="object") {
    for (field in objects) {
      if (objects.hasOwnProperty(field)) {
        operation = '=';
        if (objects[field] instanceof Array) {
          operation = objects[field][0];
          value = objects[field][1];
        } else {
          value = objects[field];
        }
        this.addWhere(field, operation, value, boolean);
      }
    }
  } else {
    this.addWhere(objects, operation, value, boolean);
  }

  return this;
};

/**
 * Add OR query param
 * @method orWhere
 * @param {Object | String} where params or field name
 * @param {String} operation '<', '<=', '>', '>=', '!=', 'in', 'between', 'not_in', 'not_between', 'like', 'not_null'
 * @param {String} value value
 * @return {Hook.Collection} this
 */
Hook.Collection.prototype.orWhere = function(objects, _operation, _value) {
  return this.where(objects, _operation, _value, "or");
};

/**
 * Find first item by _id
 * @method find
 * @param {Number} _id
 * @param {Function} callback [optional]
 * @return {Promise}
 *
 * @example Finding first item by _id, with 'success' callback as param.
 *
 *     client.collection('posts').find(50, function(data) {
 *       console.log("Row:", data);
 *     });
 *
 * @example Catching 'not found' error.
 *
 *     client.collection('posts').find(128371923).then(function(data) {
 *       console.log("Row:", data); // will never execute this
 *     }).otherwise(function(e) {
 *       console.log("Not found.");
 *     });
 *
 */
Hook.Collection.prototype.find = function(_id) {
  var promise = this.client.get(this.segments + '/' + _id, this.buildQuery());
  if (arguments.length > 1) {
    return promise.then.apply(promise, Array.prototype.slice.call(arguments,1));
  }
  return promise;
};

/**
 * Set the relationships that should be eager loaded.
 * @method with
 * @param {String} ...
 * @return {Hook.Collection}
 *
 * @example Simple relationship
 *
 *     client.collection('books').with('author').each(function(book) {
 *       console.log("Author: ", book.author.name);
 *     });
 *
 * @example Multiple relationships
 *
 *     client.collection('books').with('author', 'publisher').each(function(book) {
 *       console.log("Author: ", book.author.name);
 *       console.log("Publisher: ", book.publisher.name);
 *     });
 *
 * @example Nested relationships
 *
 *     client.collection('books').with('author.contacts').each(function(book) {
 *       console.log("Author: ", book.author.name);
 *       console.log("Contacts: ", book.author.contacts);
 *     });
 *
 */
Hook.Collection.prototype.with = function() {
  this.options.with = arguments;
  return this;
};


/**
 * The 'distinct' can be used to return only distinct (different) values.
 * @method distinct
 * @param {String} field
 * @param {String} ... more fields
 * @return {Hook.Collection} this
 */
Hook.Collection.prototype.distinct = function() {
  this.options.distinct = true;
  return this;
};

/**
 * Group results by field
 * @method group
 * @param {String} field
 * @param {String} ... more fields
 * @return {Hook.Collection} this
 */
Hook.Collection.prototype.group = function() {
  this._group = arguments;
  return this;
};

/**
 * Count the number of items on this collection
 * @method count
 * @param {Function} callback [optional]
 * @return {Promise}
 *
 * @example Count the elements of the current query
 *
 *     client.collection('posts').where('author','Vicente').count(function(total) {
 *       console.log("Total:", total);
 *     });
 */
Hook.Collection.prototype.count = function(field) {
  field = (typeof(field)==="undefined") ? '*' : field;
  this.options.aggregation = {method: 'count', field: field};
  var promise = this.get();
  if (arguments.length > 0) {
    promise.then.apply(promise, arguments);
  }
  return promise;
};

/**
 * Aggregate field with 'max' values
 * @method max
 * @param {String} field
 * @param {Function} callback [optional]
 * @return {Promise}
 *
 * @example Get the max value from highscore collection
 *
 *     client.collection('highscore').max('score', function(data) {
 *       console.log("max: ", data);
 *     });
 */
Hook.Collection.prototype.max = function(field) {
  this.options.aggregation = {method: 'max', field: field};
  var promise = this.get();
  if (arguments.length > 1) {
    promise.then.apply(promise, Array.prototype.slice.call(arguments,1));
  }
  return promise;
};

/**
 * Aggregate field with 'min' values
 * @method min
 * @param {String} field
 * @param {Function} callback [optional]
 * @return {Promise}
 *
 * @example Get the min value from highscore collection
 *
 *     client.collection('highscore').min('score', function(data) {
 *       console.log("min: ", data);
 *     });
 */
Hook.Collection.prototype.min = function(field) {
  this.options.aggregation = {method: 'min', field: field};
  var promise = this.get();
  if (arguments.length > 1) {
    promise.then.apply(promise, Array.prototype.slice.call(arguments,1));
  }
  return promise;
};

/**
 * Aggregate field with 'avg' values
 * @method avg
 * @param {String} field
 * @param {Function} callback [optional]
 * @return {Promise}
 *
 * @example Get the average value from highscore collection
 *
 *     client.collection('highscore').avg('score', function(data) {
 *       console.log("avg: ", data);
 *     });
 */
Hook.Collection.prototype.avg = function(field) {
  this.options.aggregation = {method: 'avg', field: field};
  var promise = this.get();
  if (arguments.length > 1) {
    promise.then.apply(promise, Array.prototype.slice.call(arguments,1));
  }
  return promise;
};

/**
 * Aggregate field with 'sum' values
 * @method sum
 * @param {String} field
 * @param {Function} callback [optional]
 * @return {Promise}
 *
 * @example Get the sum value from highscore collection
 *
 *     client.collection('highscore').sum('score', function(data) {
 *       console.log("sum: ", data);
 *     });
 */
Hook.Collection.prototype.sum = function(field) {
  this.options.aggregation = {method: 'sum', field: field};
  var promise = this.get();
  if (arguments.length > 1) {
    promise.then.apply(promise, Array.prototype.slice.call(arguments,1));
  }
  return promise;
};

/**
 * Query only the first result
 * @method first
 * @param {Function} callback [optional]
 * @return {Promise}
 *
 * @example Return just the first element for current query
 *
 *     client.collection('users').sort('created_at', -1).first(function(data) {
 *       console.log("Last created user:", data);
 *     });
 */
Hook.Collection.prototype.first = function() {
  this.options.first = 1;
  var promise = this.get();
  promise.then.apply(promise, arguments);
  return promise;
};

/**
 * First or create
 *
 * @method firstOrCreate
 * @param {Object} data
 * @param {Function} callback
 * @return {Promise}
 *
 * example Return the first match for 'data' param, or create it.
 *
 *     client.collection('uniques').firstOrCreate({type: "something"}).then(function(data) {
 *       console.log("Unique row: ", data);
 *     });
 */
Hook.Collection.prototype.firstOrCreate = function(data) {
  this.options.first = 1;
  this.options.data = data;
  return this.client.post(this.segments, this.buildQuery());
};

/**
 * Alias for get & then
 * @method then
 * @return {Promise}
 */
Hook.Collection.prototype.then = function() {
  var promise = this.get();
  promise.then.apply(promise, arguments);
  return promise;
};

/**
 * Alias for then & console.log.bind(console)
 * @method debug
 * @return {Promise}
 */
Hook.Collection.prototype.debug = function(func) {
  func = (typeof(func) == "undefined") ? "log" : func;
  return this.then(console[func].bind(console));
};

/**
 * Clear collection filtering state
 * @method reset
 * @return {Hook.Collection} this
 */
Hook.Collection.prototype.reset = function() {
  this.options = {};
  this.wheres = [];
  this.ordering = [];
  this._group = [];
  this._limit = null;
  this._offset = null;
  this._remember = null;
  return this;
};

/**
 * @method sort
 * @param {String} field
 * @param {Number|String} direction
 * @return {Hook.Collection} this
 *
 * @example Return just the first element for current query
 *
 *     // Ommit the second argument for ascending order:
 *     client.collection('users').sort('created_at').then(function(data){ });
 *
 *     // Use 1 or 'asc' to specify ascending order:
 *     client.collection('users').sort('created_at', 1).then(function(data){  });
 *     client.collection('users').sort('created_at', 'asc').then(function(data){  });
 *
 *     // Use -1 or 'desc' for descending order:
 *     client.collection('users').sort('created_at', -1).then(function(data) {  });
 *     client.collection('users').sort('created_at', 'desc').then(function(data) {  });
 */
Hook.Collection.prototype.sort = function(field, direction) {
  if (!direction) {
    direction = "asc";
  } else if (typeof(direction)==="number") {
    direction = (parseInt(direction, 10) === -1) ? 'desc' : 'asc';
  }
  this.ordering.push([field, direction]);
  return this;
};

/**
 * @method limit
 * @param {Number} int
 * @return {Hook.Collection} this
 *
 * @example Limit the number of rows to retrieve
 *
 *     client.collection('posts').sort('updated_at', -1).limit(5).then(function(data) {
 *       console.log("Last 5 rows updated: ", data);
 *     });
 *
 * @example Limit and offset
 *
 *     client.collection('posts').sort('updated_at', -1).limit(5).offset(5).then(function(data) {
 *       console.log("last 5 rows updated, after 5 lastest: ", data);
 *     });
 */
Hook.Collection.prototype.limit = function(int) {
  this._limit = int;
  return this;
};

/**
 * @method offset
 * @see limit
 *
 * @param {Number} int
 * @return {Hook.Collection} this
 */
Hook.Collection.prototype.offset = function(int) {
  this._offset = int;
  return this;
};

/**
 * Indicate that the query results should be cached.
 *
 * @method remember
 * @param {Number} minutes
 * @return {Hook.Collection} this
 *
 * @example Caching a query
 *
 *     client.collection('posts').sort('updated_at', -1).limit(5).remember(10).then(function(data) {
 *       // ...
 *     });
 *
 */
Hook.Collection.prototype.remember = function(minutes) {
  this._remember = minutes;
  return this;
};

/**
 * Get channel for this collection.
 * @method channel
 * @param {Object} options (optional)
 * @return {Hook.Channel}
 *
 * @example Streaming collection data
 *
 *     client.collection('messages').where('type', 'new-game').channel().subscribe(function(event, data) {
 *       console.log("Received new-game message: ", data);
 *     });
 *
 *     client.collection('messages').create({type: 'sad', text: "i'm sad because streaming won't catch me"});
 *     client.collection('messages').create({type: 'new-game', text: "yey, streaming will catch me!"});
 *
 */
Hook.Collection.prototype.channel = function(options) {
  throw new Error("Not implemented.");
  // return new Hook.Channel(this.client, this, options);
};

/**
 * @method paginate
 * @return {Hook.Pagination}
 *
 * @param {Mixed} perpage_or_callback
 * @param {Function} onComplete
 * @param {Function} onError (optional)
 */
Hook.Collection.prototype.paginate = function(perPage, onComplete, onError) {
  var pagination = new Hook.Pagination(this);

  if (!onComplete) {
    onComplete = perPage;
    perPage = Hook.defaults.perPage;
  }

  this.options.paginate = perPage;
  this.then(function(data) {
    pagination._fetchComplete(data);
    if (onComplete) { onComplete(pagination); }
  }, onError);

  return pagination;
};

/**
 * Drop entire collection. This operation is irreversible.
 * @return {Promise}
 */
Hook.Collection.prototype.drop = function() {
  return this.client.remove(this.segments);
};

/**
 * Remove a single row by id
 * @method remove
 * @param {String} id [optional]
 * @return {Promise}
 *
 * @example Deleting a row by id
 *
 *     client.collection('posts').remove(1).then(function(data) {
 *       console.log("Success:", data.success);
 *     });
 *
 * @example Deleting multiple rows
 *
 *     client.collection('ranking').where('score', 0).remove().then(function(data) {
 *       console.log("Success:", data.success);
 *     });
 */
Hook.Collection.prototype.remove = function(_id) {
  var path = this.segments;
  if (typeof(_id)!=="undefined") {
    path += '/' + _id;
  }
  return this.client.remove(path, this.buildQuery());
};

/**
 * Update a single collection entry
 * @method update
 * @param {Number | String} _id
 * @param {Object} data
 *
 * @example Updating a single row
 *
 *     client.collection('posts').update(1, { title: "Changing post title" }).then(function(data) {
 *       console.log("Success:", data.success);
 *     });
 */
Hook.Collection.prototype.update = function(_id, data) {
  return this.client.post(this.segments + '/' + _id, data);
};

/**
 * Increment a value from 'field' from all rows matching current filter.
 * @method increment
 * @param {String} field
 * @param {Number} value
 * @return {Promise}
 *
 * @example Increment user score
 *
 *     client.collection('users').where('_id', user_id).increment('score', 10).then(function(numRows) {
 *       console.log(numRows, " users has been updated");
 *     });
 */
Hook.Collection.prototype.increment = function(field, value) {
  this.options.operation = { method: 'increment', field: field, value: value };
  var promise = this.client.put(this.segments, this.buildQuery());
  if (arguments.length > 0) {
    promise.then.apply(promise, arguments);
  }
  return promise;
};

/**
 * Decrement a value from 'field' from all rows matching current filter.
 * @method decrement
 * @param {String} field
 * @param {Number} value
 * @return {Promise}
 *
 * @example Decrement user score
 *
 *     client.collection('users').where('_id', user_id).decrement('score', 10).then(function(numRows) {
 *       console.log(numRows, " users has been updated");
 *     });
 */
Hook.Collection.prototype.decrement = function(field, value) {
  this.options.operation = { method: 'decrement', field: field, value: value };
  var promise = this.client.put(this.segments, this.buildQuery());
  if (arguments.length > 0) {
    promise.then.apply(promise, arguments);
  }
  return promise;
};

/**
 * Update all collection's data based on `where` params.
 * @method updateAll
 * @param {Object} data key-value data to update from matched rows [optional]
 * @return {Promise}
 *
 * @example Updating all rows of the collection
 *
 *     client.collection('users').updateAll({category: 'everybody'}).then(function(numRows) {
 *       console.log(numRows, " users has been updated");
 *     });
 *
 * @example Updating collection filters
 *
 *     client.collection('users').where('age','<',18).updateAll({category: 'baby'}).then(function(numRows) {
 *       console.log(numRows, " users has been updated");
 *     });
 */
Hook.Collection.prototype.updateAll = function(data) {
  this.options.data = data;
  return this.client.put(this.segments, this.buildQuery());
};

Hook.Collection.prototype.addWhere = function(field, operation, value, boolean) {
  this.wheres.push([field, operation.toLowerCase(), value, boolean]);
  return this;
};

Hook.Collection.prototype._validateName = function(name) {
  var regexp = /^[a-z_\/0-9]+$/;

  if (!regexp.test(name)) {
    throw new Error("Invalid name: " + name);
  }

  return name;
};

Hook.Collection.prototype.buildQuery = function() {
  var query = {};

  // apply limit / offset and remember
  if (this._limit !== null) { query.limit = this._limit; }
  if (this._offset !== null) { query.offset = this._offset; }
  if (this._remember !== null) { query.remember = this._remember; }

  // apply wheres
  if (this.wheres.length > 0) {
    query.q = this.wheres;
  }

  // apply ordering
  if (this.ordering.length > 0) {
    query.s = this.ordering;
  }

  // apply group
  if (this._group.length > 0) {
    query.g = this._group;
  }

  var f, shortnames = {
    paginate: 'p',        // pagination (perPage)
    first: 'f',           // first / firstOrCreate
    aggregation: 'aggr',  // min / max / count / avg / sum
    operation: 'op',      // increment / decrement
    data: 'data',         // updateAll / firstOrCreate
    with: 'with',         // relationships
    select: 'select',     // fields to return
    distinct: 'distinct'  // use distinct operation
  };

  for (f in shortnames) {
    if (this.options[f]) {
      query[shortnames[f]] = this.options[f];
    }
  }

  // clear wheres/ordering for future calls
  this.reset();

  return query;
};

/**
 * module Hook
 * class Hook.CollectionItem
 *
 * param {Hook.Collection} collection
 * param {Number|String} _id
 * constructor
 */
Hook.CollectionItem = function(collection, _id) {};

/**
 * @module Hook
 * @class Hook.KeyValues
 *
 * @param {Hook.Client} client
 * @constructor
 */
Hook.KeyValues = function(client) {
  this.client = client;
};

/**
 * @method get
 * @param {String} key
 * @param {Function} callback
 * @return {Promise}
 *
 * @example Get a key value
 *
 *     client.keys.get('my-custom-key', function(key) {
 *       console.log(key.value);
 *     });
 */
Hook.KeyValues.prototype.get = function(key, callback) {
  var promise = this.client.get('key/' + key);
  if (callback) {
    promise.then.apply(promise, [callback]);
  }
  return promise;
};

/**
 * @method set
 * @param {String} key
 * @param {String|Number} value
 * @return {Promise}
 *
 * @example Set a key value
 *
 *     client.keys.set('my-custom-key', 'custom value').then(function(key) {
 *       console.log(key);
 *     });
 */
Hook.KeyValues.prototype.set = function(key, value) {
  return this.client.post('key/' + key, { value: value });
};

Hook.Model = function() {
};

/**
 * @module Hook
 * @class Hook.Pagination
 *
 * @param {Hook.Collection} collection
 * @param {Number} perPage
 * @constructor
 */
Hook.Pagination = function(collection) {
  this.fetching = true;

  /**
   * @property collection
   * @type {Hook.Collection}
   */
  this.collection = collection;
};

Hook.Pagination.prototype._fetchComplete = function(response) {
  this.fetching = false;

  /**
   * @property total
   * @type {Number}
   */
  this.total = response.total;

  /**
   * @property per_page
   * @type {Number}
   */
  this.per_page = response.per_page;

  /**
   * @property current_page
   * @type {Number}
   */
  this.current_page = response.current_page;

  /**
   * @property last_page
   * @type {Number}
   */
  this.last_page = response.last_page;

  /**
   * @property from
   * @type {Number}
   */
  this.from = response.from;

  /**
   * @property to
   * @type {Number}
   */
  this.to = response.to;

  /**
   * @property items
   * @type {Object}
   */
  this.items = response.data;
};

/**
 * @method hasNext
 * @return {Boolean}
 */
Hook.Pagination.prototype.hasNext = function() {
  return (this.current_page < this.to);
};

/**
 * @method isFetching
 * @return {Booelan}
 */
Hook.Pagination.prototype.isFetching = function() {
  return this.fetching;
};

Hook.Pagination.prototype.then = function() {
};


/**
 * @module Hook
 * @class Hook.System
 *
 * @param {Client} client
 * @constructor
 */
Hook.System = function(client) {
  this.client = client;
};

/**
 * Return server's system time.
 * @method time
 * @return {Promise}
 */
Hook.System.prototype.time = function() {
  var promise = this.client.get('system/time');
  if (arguments.length > 0) {
    promise.then.apply(promise, arguments);
  }
  return promise;
};

/**
 * @module Hook
 * @class Hook.Channel.SSE
 *
 * @param {Client} client
 * @param {String} namespace
 * @param {Object} options optional
 * @constructor
 *
 */
Hook.Channel.SSE = function(client, collection, options) {
  this.collection = collection;
  this.client_id = null;
  this.callbacks = {};
  this.options = options || {};
  this.readyState = null;
};

/**
 * Subscribe to channel. Publishes a 'connected' message on the first time.
 * @method subscribe
 * @param {String} event (optional)
 * @param {Function} callback
 * @return {Promise}
 *
 * @example Registering for all messages
 *
 *     channel.subscribe(function(event, data) {
 *       console.log("Message: ", event, data);
 *     })
 *
 * @example Registering for a single custom event
 *
 *     channel.subscribe('some-event', function(data) {
 *       console.log("Custom event triggered: ", data);
 *     })
 *
 * @example Registering for client connected/disconnected events
 *
 *     channel.subscribe('connected', function(data) {
 *       console.log("New client connected: ", data.client_id);
 *     });
 *     channel.subscribe('disconnected', function(data) {
 *       console.log("Client disconnected: ", data.client_id);
 *     });
 *
 *
 * @example Registering error event
 *
 *     channel.subscribe('state:open', function(e) {
 *       console.log("Error: ", e);
 *     });
 *     channel.subscribe('state:error', function(e) {
 *       console.log("Error: ", e);
 *     });
 *
 *
 */
Hook.Channel.SSE.prototype.subscribe = function(event, callback) {
  if (typeof(callback)==="undefined") {
    callback = event;
    event = '_default';
  }
  this.callbacks[event] = callback;

  var promise = this.connect();

  if (this.readyState === EventSource.CONNECTING) {
    var that = this;
    promise.then(function() {
      that.event_source.onopen = function(e) {
        that.readyState = e.readyState;
        that._trigger.apply(that, ['state:' + e.type, e]);
      };
      that.event_source.onerror = function(e) {
        that.readyState = e.readyState;
        that._trigger.apply(that, ['state:' + e.type, e]);
      };
      that.event_source.onmessage = function(e) {
        var data = JSON.parse(e.data),
            event = data.event;
        delete data.event;
        that._trigger.apply(that, [event, data]);
      };
    });
  }

  return promise;
};

/**
 */
Hook.Channel.SSE.prototype._trigger = function(event, data) {
  console.log("Trigger: ", event, data);
  // always try to dispatch default message handler
  if (event.indexOf('state:')===-1 && this.callbacks._default) {
    this.callbacks._default.apply(this, [event, data]);
  }
  // try to dispatch message handler for this event
  if (this.callbacks[event]) {
    this.callbacks[event].apply(this, [data]);
  }
};

/**
 * Is EventSource listenning to messages?
 * @method isConnected
 * @return {Boolean}
 */
Hook.Channel.SSE.prototype.isConnected = function() {
  return (this.readyState !== null && this.readyState !== EventSource.CLOSED);
};

/**
 * Unsubscribe to a event listener
 * @method unsubscribe
 * @param {String} event
 */
Hook.Channel.SSE.prototype.unsubscribe = function(event) {
  if (this.callbacks[event]) {
    this.callbacks[event] = null;
  }
};

/**
 * Publish event message
 * @method publish
 * @param {String} event
 * @param {Object} message
 * @return {Promise}
 */
Hook.Channel.SSE.prototype.publish = function(event, message) {
  if (typeof(message)==="undefined") { message = {}; }
  message.client_id = this.client_id;
  message.event = event;
  return this.collection.create(message);
};

Hook.Channel.SSE.prototype.connect = function() {
  // Return success if already connected.
  if (this.readyState !== null) {
    var deferred = when.defer();
    deferred.resolver.resolve();
    return deferred.promise;
  }

  this.readyState = EventSource.CONNECTING;
  this._trigger.apply(this, ['state:connecting']);

  var that = this;

  return this.publish('connected').then(function(data) {
    that.collection.where('updated_at', '>', data.updated_at);

    var queryString = 'X-App-Id=' + that.collection.client.appId +
      '&X-App-Key=' + that.collection.client.key;

    // Forward user authentication token, if it is set
    var auth_token = that.collection.client.auth.getToken();
    if (auth_token) {
      queryString += '&X-Auth-Token=' + auth_token;
    }

    // time to wait for retry, after connection closes
    var query = that.collection.buildQuery();
    query.stream = {
      'refresh': that.options.refresh_timeout || 1,
      'retry': that.options.retry_timeout || 1
    };

    that.client_id = data.client_id;
    that.event_source = new EventSource(that.collection.client.url + that.collection.segments + "?" + queryString + "&" + JSON.stringify(query), {
      withCredentials: true
    });

    // bind unload function to force user disconnection
    window.addEventListener('unload', function(e) {
      // send synchronous disconnected event
      that.disconnect(true);
    });
  }, function(data) {
    that.readyState = EventSource.CLOSED;
    that._trigger.apply(that, ['state:error', data]);
  });
};

/**
 * Disconnect from channel, publishing a 'disconnected' message.
 * @method disconnect
 * @param {Boolean} synchronous default = false
 * @return {Hook.Channel} this
 */
Hook.Channel.SSE.prototype.disconnect = function(sync) {
  if (this.isConnected()) {
    this.close();
    this.publish('disconnected', {
      _sync: ((typeof(sync)!=="undefined") && sync)
    });
  }
  return this;
};

/**
 * Close event source connection.
 * @method close
 * @return {Channel} this
 */
Hook.Channel.SSE.prototype.close = function() {
  if (this.event_source) {
    this.event_source.close();
  }
  this.readyState = EventSource.CLOSED;
  return this;
};


/**
 * @module Hook
 * @class Hook.Channel.WEBSOCKETS
 *
 * @param {Client} client
 * @param {String} namespace
 * @param {Object} options optional
 * @constructor
 *
 * @example Connecting through websockets.
 *
 *     var channel = client.channel('messages', { transport: "websockets" });
 *
 * @example Force socket server endpoint.
 *
 *     var channel = client.channel('messages', {
 *       transport: "websockets",
 *       url: "ws://localhost:8080"
 *     });
 */
Hook.Channel.WEBSOCKETS = function(client, collection, options) {
  var that = this;

  this.client = client;
  this.collection = collection;
  this.client_id = null;

  if (!options.url) {
    var scheme = window.location.protocol === 'https:' ? 'wss://' : 'ws://',
        url = client.url.replace(/(?:https?:)?\/\//, scheme)

    if (url.match(/index\.php/)) {
      url = url.replace("index.php", "ws/");
    } else {
      url += "ws/";
    }

    options.url = url;
  }

  options.url += this.collection.name + "?X-App-Id=" + this.client.appId + "&X-App-Key=" + this.client.key;
  var auth_token = this.client.auth.getToken();
  if (auth_token) {
    options.url += '&X-Auth-Token=' + auth_token;
  }

  // WAMP message debugging
  ab.debug(options.debug === true, options.verbose === true, options.debug === true);

  // subscribe to queued events when successfully connected.
  this.queued_subscriptions = {};
  this.on('connected', function() {
    for (var event in that.queued_subscriptions) {
      if (that.queued_subscriptions.hasOwnProperty(event)) {
        that.subscribe(event, that.queued_subscriptions[event]);
      }
    }
    that.queued_subscriptions = null;
  });

  ab.connect(options.url, function(session) {
    that.ws = session;
    that.client_id = session.sessionid();
    that.trigger('connected');
  }, function(err) {
    console.error("Can't connect with WebSocket server: " + options.url, err);
  }, {
    retryDelay: 1000,
    maxRetries: 10
  });
};

// Inherits from Events

Hook.Channel.WEBSOCKETS.prototype = new Hook.Events();
Hook.Channel.WEBSOCKETS.prototype.constructor = Hook.Channel.WEBSOCKETS;

/**
 * Subscribe to channel. Publishes a 'connected' message on the first time.
 * @method subscribe
 * @param {String} event (optional)
 * @param {Function} callback
 * @return {Hook.Channel}
 *
 * @example Registering for a single custom event
 *
 *     channel.subscribe('some-event', function(data) {
 *       console.log("Custom event triggered: ", data);
 *     })
 *
 * @example Registering for client connected/disconnected events
 *
 *     channel.subscribe('connected', function(data) {
 *       console.log("New client connected: ", data.client_id);
 *     });
 *     channel.subscribe('disconnected', function(data) {
 *       console.log("Client disconnected: ", data.client_id);
 *     });
 *
 */
Hook.Channel.WEBSOCKETS.prototype.subscribe = function(event, callback) {
  if (!this.ws) {
    // not connected yet, let's postpone this subscription.
    this.queued_subscriptions[event] = callback;

  } else {
    this.ws.subscribe(this.collection.name + '.' + event, function(topic, data) {
      callback(data);
    });
  }
  return this;
};

/**
 * Is EventSource listenning to messages?
 * @method isConnected
 * @return {Boolean}
 */
Hook.Channel.WEBSOCKETS.prototype.isConnected = function() {
  return this.ws && this.ws._websocket_connected;
};

/**
 * Unsubscribe to a event listener
 * @method unsubscribe
 * @param {String} event
 * @return {Hook.Channel}
 */
Hook.Channel.WEBSOCKETS.prototype.unsubscribe = function(event) {
  if (this.ws && this.ws._subscriptions[this.collection.name + '.' + event]) {
    this.ws.unsubscribe(this.collection.name + '.' + event);
  }
  return this;
};

/**
 * Publish event message
 * @method publish
 * @param {String} event
 * @param {Object} message
 * @param {Object} options 'exclude' and 'elegible' are optional options.
 * @return {Hook.Channel}
 */
Hook.Channel.WEBSOCKETS.prototype.publish = function(event, message, options) {
  var exclude = [], eligible = [];

  if (typeof(options)==="undefined") {
    options = {};
  }

  if (options.exclude && options.exclude instanceof Array) {
    exclude = options.exclude;
  }

  if (options.eligible && options.eligible instanceof Array) {
    eligible = options.eligible;
  }

  this.ws.publish(this.collection.name + '.' + event, message, exclude, eligible);
  return this;
};

/**
 * Disconnect from channel, publishing a 'disconnected' message.
 * @method disconnect
 * @return {Hook.Channel} this
 */
Hook.Channel.WEBSOCKETS.prototype.disconnect = function() {
  this.ws.close();
  return this;
};

/**
 * @method call
 * @param {String} procedure
 * @return {Promise}
 */
Hook.Channel.WEBSOCKETS.prototype.call = function(procedure, callbacks) {
  this.ws.call(procedure, callbacks);
  return this;
};
Hook.Channel.WEBSOCKETS.prototype.connect = function() {
  this.ws.connect();
  return this;
};

})(this);
