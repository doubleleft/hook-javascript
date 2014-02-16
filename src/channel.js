/**
 * @class DL.Channel
 * @constructor
 * @param {Client} client
 */
DL.Channel = function(client, collection) {
  this.collection = collection;
  this.client_id = null;
};

/**
 * Subscribe to event
 * @method subscribe
 * @param {String} event
 * @param {Function} callback
 * @return {DL.Channel} this
 *
 * @example Registering for all messages
 *
 *     channel.subscribe('message', function(e) {
 *       console.log("Message: ", e);
 *     })
 *
 * @example Registering for a single custom event
 *
 *     channel.subscribe('custom-event', function(e) {
 *       console.log("Custom event triggered: ", e);
 *     })
 *
 * @example Registering error event
 *
 *     channel.subscribe('error', function(e) {
 *       console.log("Error: ", e);
 *     })
 *
 *
 */
DL.Channel.prototype.subscribe = function(event, callback) {
  var that = this;
  this.connect().then(function() {
    if (event == 'error') {
      that.event_source.addEventListener(event, function(e) {
        callback.apply(that, [e]);
      }, false);
    } else {
      that.event_source.addEventListener(event, function(e) {
        callback.apply(that, [JSON.parse(e.data), e]);
      }, false);
    }
  });
  return this;
};


/**
 * Unsubscribe to a event listener
 * @param {String} event
 */
DL.Channel.prototype.unsubscribe = function(event) {
  this.event_source['on' + event] = null;
};

/**
 * Publish event message
 * @param {String} event
 * @param {Object} message
 * @param {Boolean} synchronous optional; default=false
 * @return {Promise}
 */
DL.Channel.prototype.publish = function(event, message, sync) {
  var data = {
    event: event,
    message: data,
    client_id: this.client_id
  };

  if (typeof(sync)==="undefined") {
    sync = false;
  } else {
    data._sync = sync;
  }

  return this.collection.create(data);
};

/**
 * @return {Promise}
 */
DL.Channel.prototype.connect = function() {
  // Return success if already connected.
  if (this.event_source) {
    var deferred = when.defer();
    deferred.resolver.resolve();
    return deferred.promise;
  }

  var that = this,
      options = {},
      query = this.collection.buildQuery();

  query['X-App-Id'] = this.collection.client.appId;
  query['X-App-Key'] = this.collection.client.key;

  // Forward user authentication token, if it is set
  var auth_token = window.localStorage.getItem(query['X-App-Id'] + '-' + DL.Auth.AUTH_TOKEN_KEY);
  if (auth_token) {
    query['X-Auth-Token'] = auth_token;
  }

  // time to wait for retry, after connection closes
  query.stream = {
    'refresh': options.refresh_timeout || 1,
    'retry': options.retry_timeout || 1
  };

  return this.publish('connected', {
    user_id: this.collection.client.auth.currentUser && this.collection.client.auth.currentUser._id
  }).then(function(data) {
    that.client_id = data.client_id;
    that.event_source = new EventSource(that.collection.client.url + that.collection.segments + "?" + JSON.stringify(query), {
      withCredentials: true
    });
    // bind unload function to force user disconnection
    window.addEventListener('unload', function(e) {
      that.disconnect();
    });
  });
};

/**
 * Close streaming connection
 * @method close
 * @return {Channel} this
 */
DL.Channel.prototype.disconnect = function() {
  if (this.event_source) {
    this.event_source.close();
    // send synchronous disconnect event
    var data = { client_id: this.client_id },
        currentUserId = this.collection.client.auth.currentUser && this.collection.client.auth.currentUser._id;

    if (currentUserId) { data.user_id = currentUserId; }
    this.publish('disconnected', , true);
  }
  return this;
};
