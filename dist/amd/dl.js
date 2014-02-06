/*
 * dl-api-javascript v0.1.0
 * https://github.com/doubleleft/dl-api-javascript
 *
 * @copyright 2014 Doubleleft
 * @build 2/6/2014
 */
(function(define) { 'use strict';
define(function (require) {


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
    success: function(response) {
      // FIXME: errors shouldn't trigger success callback, that's a uxhr problem?
      var data = JSON.parse(response);
      if (data.error) {
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
 * @method logout
 * @return {DL.Auth} this
 */
DL.Auth.prototype.logout = function() {
  this.currentUser = null;
  window.localStorage.removeItem(this.client.appId + '-' + DL.Auth.AUTH_TOKEN_KEY);
  window.localStorage.removeItem(this.client.appId + '-' + DL.Auth.AUTH_DATA_KEY);
  return this;
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
 * @param {String} operation operation or value
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
 * Stream
 * @method stream
 * @param {Object|Function} callback_or_bindings
 * @return {DL.Stream}
 *
 * @example Streaming collection data
 *
 *     client.collection('messages').where('type', 'new-game').stream(function(data) {
 *       console.log("Received new-game message: ", data);
 *     });
 *
 *     client.collection('messages').create({type: 'sad', text: "i'm sad because streaming won't catch me"});
 *     client.collection('messages').create({type: 'new-game', text: "yey, streaming will catch me!"});
 *
 * @example Getting only newly updated items from collection
 *
 *     client.collection('messages').stream({
 *       from_now: true,
 *       message: function(data) {
 *         console.log("Just created/updated:", data);
 *       }
 *     });
 *
 * @example Setting custom timeout configs
 *
 *     client.collection('messages').stream({
 *       retry_timeout: 10,   // re-open streaming after 10 seconds
 *       refresh_timeout: 2,  // refresh streaming data every 2 seconds
 *       message: function(data) {
 *         console.log("Just created/updated:", data);
 *       }
 *     });
 *
 */
DL.Collection.prototype.stream = function(bindings) {
  return new DL.Stream(this, bindings);
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
  this.wheres.push([field, operation, value]);
  return this;
};

DL.Collection.prototype._validateName = function(name) {
  var regexp = /^[a-z_]+$/;

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


DL.File = function(client) {
  this.client = client;

  this.upload = function() {
    //this.client.
  };
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
 * @class DL.Stream
 * @constructor
 * @param {Client} client
 */
DL.Stream = function(collection, options) {
  if (!options) { options = {}; }

  this.collection = collection;

  var query = this.collection.buildQuery();
  query['X-App-Id'] = this.collection.client.appId;
  query['X-App-Key'] = this.collection.client.key;

  // Forward user authentication token, if it is set
  var auth_token = window.localStorage.getItem(query['X-App-Id'] + '-' + DL.Auth.AUTH_TOKEN_KEY);
  if (auth_token) {
    query['X-Auth-Token'] = auth_token;
  }

  query.only_new = options.only_new || false;

  // time to wait for retry, after connection closes
  query.stream = {
    'retry': options.retry_timeout || 5,
    'refreh': options.refresh_timeout || 5
  };

  this.event_source = new EventSource(this.collection.client.url + this.collection.segments + "?" + JSON.stringify(query), {
    withCredentials: true
  });

  // bind event source
  if (typeof(options)==="function") {
    this.on('message', options);
  } else {
    for (var event in options) {
      this.on(event, options[event]);
    }
  }
};

/**
 * Register event handler
 * @method on
 * @param {String} event
 * @param {Function} callback
 * @return {Stream} this
 *
 * @example Registering error event
 *
 *     client.collection('something').stream().on('error', function(e) {
 *       console.log("Error: ", e);
 *     })
 *
 *
 * @example Registering message event
 *
 *     client.collection('something').stream().on('message', function(e) {
 *       console.log("Message: ", e);
 *     })
 */
DL.Stream.prototype.on = function(event, callback) {
  var that = this;

  if (event == 'message') {
    this.event_source.onmessage = function(e) {
      callback.apply(that, [JSON.parse(e.data), e]);
    };
  } else {
    this.event_source['on' + event] = function(e) {
      callback.apply(that, [e]);
    };
  }

  return this;
};

/**
 * Close streaming connection
 * @method close
 * @return {Stream} this
 */
DL.Stream.prototype.close = function() {
  this.event_source.close();
  return this;
};

return DL;
});
})(typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); });
