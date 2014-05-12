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
 * @module DL
 * @class DL.Client
 *
 * @param {Object} options
 *   @param {String} options.appId
 *   @param {String} options.key
 *   @param {String} options.url default: http://dl-api.dev
 *
 * @constructor
 */

//
// IE9<: prevent crash when FormData isn't defined.
//
if(typeof(window.FormData)==="undefined"){
    window.FormData = function(){ this.append=function(){}; };
}

DL.Client = function(options) {
  this.url = options.url || "http://dl-api.dev/api/public/index.php/";
  this.appId = options.appId;
  this.key = options.key;
  this.proxy = options.proxy;

  /**
   * @property {DL.KeyValues} keys
   */
  this.keys = new DL.KeyValues(this);

  /**
   * @property {DL.Auth} auth
   */
  this.auth = new DL.Auth(this);

  /**
   * @property {DL.Fiels} files
   */
  this.files = new DL.Files(this);

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
DL.Client.prototype.remove = function(segments, data) {
  return this.request(segments, "DELETE", data);
};

/**
 * @method request
 * @param {String} segments
 * @param {String} method
 * @param {Object} data
 */
DL.Client.prototype.request = function(segments, method, data) {
  var payload, request_headers, deferred = when.defer(),
      synchronous = false;

  // FIXME: find a better way to write this
  if (data && data._sync) {
    delete data._sync;
    synchronous = true;
  }

  // Compute payload
  payload = this.getPayload(method, data);

  if (this.proxy) {
    // Compute request headers
    request_headers = this.getHeaders();
    if(!(payload instanceof FormData)){
      request_headers["Content-Type"] = 'application/json'; // exchange data via JSON to keep basic data types
    }

    // Forward API endpoint to proxy
    request_headers["X-Endpoint"] = this.url;

  } else {
    segments += "?X-App-Id=" + this.appId + "&X-App-Key=" + this.key;
  }

  var xhr = uxhr((this.proxy || this.url) + segments, payload, {
    method: method,
    // headers: request_headers,
    sync: synchronous,
    success: function(response) {
      var data = null;
      try{
        data = JSON.parse(response);
      } catch(e) {
        //something wrong with JSON. IE throws exception on JSON.parse
      }

      if (!data || data.error) {
        deferred.resolver.reject(data);
      } else {
        deferred.resolver.resolve(data);
      }
    },
    error: function(response) {
      var data = null;
      try{
        data = JSON.parse(response);
      }catch(e){
      }
      console.log("Error: ", data || "invalid json response");
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
DL.Client.prototype.getHeaders = function() {
  // App authentication request headers
  var request_headers = {
    'X-App-Id': this.appId,
    'X-App-Key': this.key,
  }, auth_token;

  // Forward user authentication token, if it is set
  var auth_token = window.localStorage.getItem(this.appId + '-' + DL.Auth.AUTH_TOKEN_KEY);
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
DL.Client.prototype.getPayload = function(method, data) {
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

        } if (value instanceof HTMLInputElement && value.files.length > 0) {
          filename = value.files[0].name;
          value = value.files[0];
          worth = true;

        } else if (value instanceof HTMLInputElement) {
          value = value.value;

        } else if (value instanceof HTMLCanvasElement) {
          value = dataURLtoBlob(value.toDataURL());
          worth = true;
          filename = 'canvas.png';

        } else if (value instanceof Blob) {
          worth = true;
          filename = 'blob.' + value.type.match(/\/(.*)/)[1]; // get extension from blob mime/type
        }

        //
        // Consider serialization to keep data types here: http://phpjs.org/functions/serialize/
        //
        if (!(value instanceof Array)) { // fixme
          try {
            formdata.append(field, value, filename || "file");
          } catch (e) {
            formdata.append(field, value);
          }
        }

      }

      if (worth) {
        payload = formdata;
      }
    }

    payload = payload || JSON.stringify(data);
    if (method==="GET" && typeof(payload)==="string") {
      payload = encodeURIComponent(payload);
    }
  }
  return payload;
}

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
