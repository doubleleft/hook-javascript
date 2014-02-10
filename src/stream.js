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
    'retry': options.retry_timeout || 1,
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
