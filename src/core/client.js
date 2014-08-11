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
  if(!(payload instanceof FormData)){
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

        } else if (typeof(value)==="string") {
          //
          // Do nothing...
          //
          // IE8 can't compare instanceof String with HTMLInputElement. LOL
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
          try {
            formdata.append(field, value, filename || "file");
          } catch (e) {
            try {
              // on cli-console (nodejs), here throwns error when using Collection.updateAll
              formdata.append(field, value);
            } catch (e2) {}
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
