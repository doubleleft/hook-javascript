/**
 * @module DL
 * @class DL.Channel.SSE
 *
 * @param {Client} client
 * @param {String} namespace
 * @param {Object} options optional
 * @constructor
 *
 */
DL.Channel.SSE = function(client, collection, options) {
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
DL.Channel.SSE.prototype.subscribe = function(event, callback) {
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
DL.Channel.SSE.prototype._trigger = function(event, data) {
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
DL.Channel.SSE.prototype.isConnected = function() {
  return (this.readyState !== null && this.readyState !== EventSource.CLOSED);
};

/**
 * Unsubscribe to a event listener
 * @method unsubscribe
 * @param {String} event
 */
DL.Channel.SSE.prototype.unsubscribe = function(event) {
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
DL.Channel.SSE.prototype.publish = function(event, message) {
  if (typeof(message)==="undefined") { message = {}; }
  message.client_id = this.client_id;
  message.event = event;
  return this.collection.create(message);
};

DL.Channel.SSE.prototype.connect = function() {
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
 * @return {DL.Channel} this
 */
DL.Channel.SSE.prototype.disconnect = function(sync) {
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
DL.Channel.SSE.prototype.close = function() {
  if (this.event_source) {
    this.event_source.close();
  }
  this.readyState = EventSource.CLOSED;
  return this;
};

