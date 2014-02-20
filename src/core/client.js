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
 * @method channel
 * @param {String} name
 * @param {Object} options (optional)
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
DL.Client.prototype.remove = function(segments) {
  return this.request(segments, "DELETE");
};

/**
 * @method request
 * @param {String} segments
 * @param {String} method
 * @param {Object} data
 */
DL.Client.prototype.request = function(segments, method, data) {
  var payload, request_headers, auth_token, deferred = when.defer(),
      synchronous = false;

  // FIXME: find a better way to write this
  if (data && data.data && data.data._sync) {
    delete data.data._sync;
    synchronous = true;
  }

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
    sync: synchronous,
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
