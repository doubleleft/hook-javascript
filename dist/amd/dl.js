/*
 * dl-api-javascript v0.1.0
 * https://github.com/doubleleft/dl-api-javascript
 *
 * @copyright 2014 Doubleleft
 * @build 2/18/2014
 */
(function(define) { 'use strict';
define(function (require) {


/**
 * @module DL
 */
var DL = {
  VERSION: "0.1.0",
  defaults: {
    perPage: 50
  }
};

window.DL = DL;

/**
 * DL.Client is the entry-point for using dl-api.
 *
 * You should instantiate a global javascript client for consuming dl-api.
 *
 * ```javascript
 * window.dl = new DL.Client({
 *   url: "http://local-or-remote-dl-api-address.com/api/public/index.php/",
 *   appId: 1,    // your app's id
 *   key: 'test'  // your app's public key
 * });
 * ```
 *
 * @class DL.Client
 * @constructor
 * @param {Object} options
 *   @param {String} options.appId
 *   @param {String} options.key
 *   @param {String} options.url default: http://dl-api.dev
 *
 */
DL.Client = function(options) {
  this.url = options.url || "http://dl-api.dev/api/public/index.php/";
  this.appId = options.appId;
  this.key = options.key;

  /**
   * @property {DL.KeyValues} keys
   */
  this.keys = new DL.KeyValues(this);

  /**
   * @property {DL.Auth} auth
   */
  this.auth = new DL.Auth(this);

  /**
   * @property {DL.System} system
   */
  this.system = new DL.System(this);
};

/**
 * Get collection instance.
 * @method collection
 * @param {String} collectionName
 * @return {DL.Collection}
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
DL.Client.prototype.collection = function(collectionName) {
  return new DL.Collection(this, collectionName);
};

/**
 * Get channel instance.
 * @method collection
 * @param {String} name
 * @param {Object} options
 * @return {DL.Channel}
 *
 * @example Retrieve a channel reference.
 *
 *     var messages = client.channel('messages');
 *
 */
DL.Client.prototype.channel = function(name, options) {
  var collection = this.collection(name);
  collection.segments = collection.segments.replace('collection/', 'channels/');
  return new DL.Channel(this, collection, options);
};

/**
 * @method post
 * @param {String} segments
 * @param {Object} data
 */
DL.Client.prototype.post = function(segments, data) {
  if (typeof(data)==="undefined") {
    data = {};
  }
  return this.request(segments, "POST", data);
};

/**
 * @method get
 * @param {String} segments
 * @param {Object} data
 */
DL.Client.prototype.get = function(segments, data) {
  return this.request(segments, "GET", data);
};

/**
 * @method put
 * @param {String} segments
 * @param {Object} data
 */
DL.Client.prototype.put = function(segments, data) {
  return this.request(segments, "PUT", data);
};

/**
 * @method delete
 * @param {String} segments
 */
DL.Client.prototype.delete = function(segments) {
  return this.request(segments, "DELETE");
};

/**
 * @method request
 * @param {String} segments
 * @param {String} method
 * @param {Object} data
 */
DL.Client.prototype.request = function(segments, method, data) {
  var payload, request_headers, auth_token, deferred = when.defer();

  if (data) {
    payload = JSON.stringify(data);

    if (method === "GET") {
      payload = encodeURIComponent(payload);
    }
  }

  // App authentication request headers
  request_headers = {
    'X-App-Id': this.appId,
    'X-App-Key': this.key,
    'Content-Type': 'application/json' // exchange data via JSON to keep basic data types
  };

  // Forward user authentication token, if it is set
  auth_token = window.localStorage.getItem(this.appId + '-' + DL.Auth.AUTH_TOKEN_KEY);
  if (auth_token) {
    request_headers['X-Auth-Token'] = auth_token;
  }

  uxhr(this.url + segments, payload, {
    method: method,
    headers: request_headers,
    sync: (data && data._sync) || false,
    success: function(response) {
      // FIXME: errors shouldn't trigger success callback, that's a uxhr problem?
      var data = JSON.parse(response);
      if (!data || data.error) {
        deferred.resolver.reject(data);
      } else {
        deferred.resolver.resolve(data);
      }
    },
    error: function(response) {
      var data = JSON.parse(response);
      console.log("Error: ", data);
      deferred.resolver.reject(data);
    }
  });

  return deferred.promise;
};

DL.Client.prototype.serialize = function(obj, prefix) {
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
 * Iterable is for internal use only.
 * @class DL.Iterable
 */
DL.Iterable = function() { };
DL.Iterable.prototype = {
  /**
   * @method each
   * @param {Function} callback
   */
  each : function(callback) { return this._iterate('each', callback); },

  /**
   * @method find
   * @param {Function} callback
   */
  find : function(callback) { return this._iterate('find', callback); },

  /**
   * @method filter
   * @param {Function} callback
   */
  filter : function(callback) { return this._iterate('filter', callback); },

  /**
   * @method max
   * @param {Function} callback
   */
  max : function(callback) { return this._iterate('max', callback); },

  /**
   * @method min
   * @param {Function} callback
   */
  min : function(callback) { return this._iterate('min', callback); },

  /**
   * @method every
   * @param {Function} callback
   */
  every : function(callback, accumulator) { return this._iterate('every', callback); },

  /**
   * @method reject
   * @param {Function} callback
   */
  reject : function(callback, accumulator) { return this._iterate('reject', callback, accumulator); },

  /**
   * @method groupBy
   * @param {Function} callback
   */
  groupBy : function(callback, accumulator) { return this._iterate('groupBy', callback, accumulator); },

  /**
   * Iterate using lodash function
   * @method _iterate
   * @param {String} method
   * @param {Function} callback
   * @param {Object} argument
   */
  _iterate : function(method, callback, arg3) {
    var that = this;

    this.then(function(data) {
      _[method].call(that, data, callback, arg3);
    });

    return this;
  }
};

/**
 * Deals with user registration/authentication
 * @class DL.Auth
 * @param {DL.Client} client
 * @constructor
 */
DL.Auth = function(client) {
  this.client = client;
  this._currentUser = null;

  Object.defineProperty(this, 'currentUser', {
    get: function() {
      if (!this._currentUser) {
        this._currentUser = window.localStorage.getItem(this.client.appId + '-' + DL.Auth.AUTH_DATA_KEY);
        if (this._currentUser) {
          this._currentUser = JSON.parse(this.currentUser); // localStorage only supports recording strings, so we need to parse it
        }
      }
      return this._currentUser;
    },
    set: function(data) {
      this._currentUser = data;
      if (!data) {
        window.localStorage.removeItem(this.client.appId + '-' + DL.Auth.AUTH_TOKEN_KEY);
        window.localStorage.removeItem(this.client.appId + '-' + DL.Auth.AUTH_DATA_KEY);
      } else {
        window.localStorage.setItem(this.client.appId + '-' + DL.Auth.AUTH_DATA_KEY, JSON.stringify(data));
      }
    }
  });
};

// Constants
DL.Auth.AUTH_TOKEN_KEY = 'dl-api-auth-token';
DL.Auth.AUTH_DATA_KEY = 'dl-api-auth-data';

/**
 * Register user using current authentication provider.
 *
 * @param {String} provider
 * @param {Object} data
 * @method authenticate
 *
 * @example Authenticating with email address
 *
 *     client.auth.authenticate('email', {
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
 *       client.auth.authenticate('facebook', response.authResponse).then(function(user) {
 *         console.log("Registered user: ", user);
 *       });
 *     }, {scope: 'email'});
 *
 *
 */
DL.Auth.prototype.authenticate = function(provider, data) {
  var promise, that = this;
  if (typeof(data)==="undefined") { data = {}; }
  promise = this.client.post('auth/' + provider, data);
  promise.then(function(data) {
    that.registerToken(data);
  });
  return promise;
};

/**
 * Verify if user is already registered, and log-in if succeed.
 * @method verify
 * @param {String} provider
 * @param {Object} data
 * @return {Promise}
 *
 * @example
 *
 *     client.auth.verify('email', {email: "edreyer@doubleleft.com", password: "123"}).then(function(data){
 *       console.log("User found: ", data);
 *     }, function(data){
 *       console.log("User not found or password invalid.", data);
 *     });
 */
DL.Auth.prototype.verify = function(provider, data) {
  var promise, that = this;
  if (typeof(data)==="undefined") { data = {}; }
  promise = this.client.post('auth/' + provider + '/verify', data);
  promise.then(function(data) {
    that.registerToken(data);
  });
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
  this.currentUser = null;
  return this;
};

DL.Auth.prototype.registerToken = function(data) {
  if (data.token) {
    // register authentication token on localStorage
    window.localStorage.setItem(this.client.appId + '-' + DL.Auth.AUTH_TOKEN_KEY, data.token.token);
    delete data.token;

    // Store curent user
    this.currentUser = data;
  }
};

/**
 * @class DL.Channel
 * @constructor
 * @param {Client} client
 */
DL.Channel = function(client, collection, options) {
  this.collection = collection;
  this.client_id = null;
  this.callbacks = {};
  this.options = options || {};
  this.readyState = null;
};

/**
 * Subscribe to event
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
DL.Channel.prototype.subscribe = function(event, callback) {
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
DL.Channel.prototype._trigger = function(event, data) {
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
 * @return {Boolean}
 */
DL.Channel.prototype.isConnected = function() {
  return (this.event_source !== null);
};

/**
 * Unsubscribe to a event listener
 * @param {String} event
 */
DL.Channel.prototype.unsubscribe = function(event) {
  if (this.callbacks[event]) {
    this.callbacks[event] = null;
  }
};

/**
 * Publish event message
 * @param {String} event
 * @param {Object} message
 * @return {Promise}
 */
DL.Channel.prototype.publish = function(event, message) {
  if (typeof(message)==="undefined") { message = {}; }
  message.client_id = this.client_id;
  message.event = event;
  return this.collection.create(message);
};

/**
 * @return {Promise}
 */
DL.Channel.prototype.connect = function() {
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

    var query = that.collection.buildQuery();

    query['X-App-Id'] = that.collection.client.appId;
    query['X-App-Key'] = that.collection.client.key;

    // Forward user authentication token, if it is set
    var auth_token = window.localStorage.getItem(query['X-App-Id'] + '-' + DL.Auth.AUTH_TOKEN_KEY);
    if (auth_token) {
      query['X-Auth-Token'] = auth_token;
    }

    // time to wait for retry, after connection closes
    query.stream = {
      'refresh': that.options.refresh_timeout || 1,
      'retry': that.options.retry_timeout || 1
    };

    that.client_id = data.client_id;
    that.event_source = new EventSource(that.collection.client.url + that.collection.segments + "?" + JSON.stringify(query), {
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
 * Close streaming connection
 * @method close
 * @param {Boolean} synchronous default = false
 * @return {Channel} this
 */
DL.Channel.prototype.disconnect = function(sync) {
  if (this.event_source) {
    this.event_source.close();
    this.publish('disconnected', {
      _sync: ((typeof(sync)!=="undefined") && sync)
    });
  }
  return this;
};

/**
 * @class DL.Collection
 *
 * @param {DL.Client} client
 * @param {String} name
 * @constructor
 */
DL.Collection = function(client, name) {
  this.client = client;

  this.name = this._validateName(name);
  this.reset();

  this.segments = 'collection/' + this.name;
};

// Inherits from DL.Iterable
DL.Collection.prototype = new DL.Iterable();
DL.Collection.prototype.constructor = DL.Collection;

/**
 * Create a new resource
 * @method create
 * @param {Object} data
 * @return {DL.Collection} this
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
DL.Collection.prototype.create = function(data) {
  return this.client.post(this.segments, { data: data });
};

/**
 * Get collection data, based on `where` params.
 * @method get
 * @return {DL.Collection} this
 */
DL.Collection.prototype.get = function() {
  return this.client.get(this.segments, this.buildQuery());
};

/**
 * Add `where` param
 * @method where
 * @param {Object | String} where params or field name
 * @param {String} operation '<', '<=', '>', '>=', '!=', 'in', 'between', 'not_in', 'not_between'
 * @param {String} value value
 * @return {DL.Collection} this
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
 */
DL.Collection.prototype.where = function(objects, _operation, _value) {
  var field,
      operation = (typeof(_value)==="undefined") ? '=' : _operation,
      value = (typeof(_value)==="undefined") ? _operation : _value;

  if (typeof(objects)==="object") {
    for (field in objects) {
      if (objects.hasOwnProperty(field)) {
        if (objects[field] instanceof Array) {
          operation = objects[field][0];
          value = objects[field][1];
        } else {
          value = objects[field];
        }
        this.addWhere(field, operation, value);
      }
    }
  } else {
    this.addWhere(objects, operation, value);
  }

  return this;
};

/**
 * Group results by field
 * @method group
 * @param {String} field
 * @param {String} ... more fields
 * @return {DL.Collection} this
 */
DL.Collection.prototype.group = function() {
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
DL.Collection.prototype.count = function() {
  this.options.aggregation = {method: 'count', field: null};
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
DL.Collection.prototype.max = function(field) {
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
DL.Collection.prototype.min = function(field) {
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
DL.Collection.prototype.avg = function(field) {
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
DL.Collection.prototype.sum = function(field) {
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
DL.Collection.prototype.first = function() {
  this.options.first = 1;
  var promise = this.get();
  promise.then.apply(promise, arguments);
  return promise;
};

/**
 * First or create
 * method firstorCreate
 * param {Object} data
 * param {Function} callback
 * return {Promise}
 *
 * example Return the first match for 'data' param, or create it.
 *
 *     client.collection('uniques').firstOrCreate({type: "something"}).then(function(data) {
 *       console.log("Unique row: ", data);
 *     });
 */
DL.Collection.prototype.firstOrCreate = function(data) {
  throw new Error("Not implemented");
  // var promise;
  // this.options.first = 1;
  // promise = this.client.post(this.segments, { data: data, options: this.buildQuery() });
  // if (arguments.length > 1) {
  //   promise.then(arguments[1]);
  // }
  // return promise;
};

/**
 * Alias for get & then
 * @method then
 */
DL.Collection.prototype.then = function() {
  var promise = this.get();
  promise.then.apply(promise, arguments);
  return promise;
};

/**
 * Clear collection filtering state
 * @method reset
 * @return {DL.Collection} this
 */
DL.Collection.prototype.reset = function() {
  this.options = {};
  this.wheres = [];
  this.ordering = [];
  this._group = [];
  this._limit = null;
  this._offset = null;
  return this;
};

/**
 * @method sort
 * @param {String} field
 * @param {Number|String} direction
 * @return {DL.Collection} this
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
DL.Collection.prototype.sort = function(field, direction) {
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
 * @return {DL.Collection} this
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
DL.Collection.prototype.limit = function(int) {
  this._limit = int;
  return this;
};

/**
 * @method offset
 * @see limit
 *
 * @param {Number} int
 * @return {DL.Collection} this
 */
DL.Collection.prototype.offset = function(int) {
  this._offset = int;
  return this;
};

/**
 * Get channel for this collection.
 * @method channel
 * @param {Object} options (optional)
 * @return {DL.Channel}
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
DL.Collection.prototype.channel = function(options) {
  throw new Error("Not implemented.");
  // return new DL.Channel(this.client, this, options);
};

/**
 * @method paginate
 * @return {DL.Pagination}
 *
 * @param {Mixed} perpage_or_callback
 * @param {Function} callback
 */
DL.Collection.prototype.paginate = function(perPage, callback) {
  var pagination = new DL.Pagination(this);

  if (!callback) {
    callback = perPage;
    perPage = DL.defaults.perPage;
  }

  this.options.paginate = perPage;
  this.get().then(function(data) {
    pagination._fetchComplete(data);
    if (callback) { callback(pagination); }
  });

  return pagination;
};

/**
 * Drop entire collection. This operation is irreversible.
 * @return {Promise}
 */
DL.Collection.prototype.drop = function() {
  return this.client.delete(this.segments);
};

/**
 * Remove a single row by id
 * @param {String} id
 * @return {Promise}
 *
 * @example Deleting a row by id
 *
 *     client.collection('posts').delete(1).then(function(data) {
 *       console.log("Success:", data.success);
 *     });
 */
DL.Collection.prototype.delete = function(_id) {
  return this.client.delete(this.segments + '/' + _id);
};

/**
 * Update a single collection entry
 * @param {Number | String} _id
 * @param {Object} data
 *
 * @example Updating a single row
 *
 *     client.collection('posts').update(1, { title: "Changing post title" }).then(function(data) {
 *       console.log("Success:", data.success);
 *     });
 */
DL.Collection.prototype.update = function(_id, data) {
  return this.client.post(this.segments + '/' + _id, { data: data });
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
DL.Collection.prototype.increment = function(field, value) {
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
DL.Collection.prototype.decrement = function(field, value) {
  this.options.operation = { method: 'decrement', field: field, value: value };
  var promise = this.client.put(this.segments, this.buildQuery());
  if (arguments.length > 0) {
    promise.then.apply(promise, arguments);
  }
  return promise;
};

/**
 * Update all collection's data based on `where` params.
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
DL.Collection.prototype.updateAll = function(data) {
  this.options.data = data;
  return this.client.put(this.segments, this.buildQuery());
};

DL.Collection.prototype.addWhere = function(field, operation, value) {
  this.wheres.push([field, operation.toLowerCase(), value]);
  return this;
};

DL.Collection.prototype._validateName = function(name) {
  var regexp = /^[a-z_\/]+$/;

  if (!regexp.test(name)) {
    throw new Error("Invalid name: " + name);
  }

  return name;
};

DL.Collection.prototype.buildQuery = function() {
  var query = {};

  // apply limit / offset
  if (this._limit !== null) { query.limit = this._limit; }
  if (this._offset !== null) { query.offset = this._offset; }

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
    paginate: 'p',
    data: 'd',
    first: 'f',
    aggregation: 'aggr',
    operation: 'op'
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
 */
DL.Files = function(client) {
  this.client = client;
};

/**
 * @return {Promise}
 */
DL.Files.prototype.upload = function(provider, data) {
  this.client.post('/files', data);
};

/**
 * @return {Promise}
 */
DL.Files.prototype.get = function(_id) {
  return this.client.get('/files', { _id: _id });
};

/**
 * @class DL.KeyValues
 * @constructor
 * @param {DL.Client} client
 */
DL.KeyValues = function(client) {
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
DL.KeyValues.prototype.get = function(key, callback) {
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
DL.KeyValues.prototype.set = function(key, value) {
  return this.client.post('key/' + key, { value: value });
};

/**
 * @class DL.Pagination
 * @param {DL.Collection} collection
 * @param {Number} perPage
 * @constructor
 */
DL.Pagination = function(collection) {
  this.fetching = true;

  /**
   * @property collection
   * @type {DL.Collection}
   */
  this.collection = collection;
};

DL.Pagination.prototype._fetchComplete = function(response) {
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
   * @property data
   * @type {Object}
   */
  this.data = response.data;
};

/**
 * @method hasNext
 * @return {Boolean}
 */
DL.Pagination.prototype.hasNext = function() {
  return (this.current_page < this.to);
};

/**
 * @method isFetching
 * @return {Booelan}
 */
DL.Pagination.prototype.isFetching = function() {
  return this.fetching;
};

DL.Pagination.prototype.then = function() {
};

/**
 * @class DL.System
 * @constructor
 * @param {Client} client
 */
DL.System = function(client) {
  this.client = client;
};

/**
 * Return server's system time.
 * @method time
 * @return {Promise}
 */
DL.System.prototype.time = function() {
  var promise = this.client.get('system/time');
  if (arguments.length > 0) {
    promise.then.apply(promise, arguments);
  }
  return promise;
};

return DL;
});
})(typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); });
