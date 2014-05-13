/**
 * @module DL
 * @class DL.Channel
 *
 * @param {Client} client
 * @param {String} namespace
 * @param {Object} options optional
 * @constructor
 */
DL.Channel = function(client, collection, options) {
  if (!options.transport) {
    options.transport = 'SSE';
  } else {
    options.transport = options.transport.toUpperCase();
  }
  this.transport = new DL.Channel.Transport[options.transport](client, collection, options);
};

/**
 * Channel implementations
 */
DL.Channel.Transport = {};

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
DL.Channel.prototype.subscribe = function() {
  return this.transport.subscribe.apply(this.transport, arguments);
};

/**
 * Is EventSource listenning to messages?
 * @method isConnected
 * @return {Boolean}
 */
DL.Channel.prototype.isConnected = function() {
  return this.transport.isConnected.apply(this.transport, arguments);
};

/**
 * Unsubscribe to a event listener
 * @method unsubscribe
 * @param {String} event
 */
DL.Channel.prototype.unsubscribe = function() {
  return this.transport.unsubscribe.apply(this.transport, arguments);
};

/**
 * Publish event message
 * @method publish
 * @param {String} event
 * @param {Object} message
 * @return {Promise}
 */
DL.Channel.prototype.publish = function() {
  return this.transport.publish.apply(this.transport, arguments);
};

/**
 * @return {Promise}
 */
DL.Channel.prototype.connect = function() {
  return this.transport.connect.apply(this.transport, arguments);
};

/**
 * Disconnect from channel, publishing a 'disconnected' message.
 * @method disconnect
 * @param {Boolean} synchronous default = false
 * @return {Channel} this
 */
DL.Channel.prototype.disconnect = function() {
  return this.transport.disconnect.apply(this.transport, arguments);
};

/**
 * Close event source connection.
 * @method close
 * @return {Channel} this
 */
DL.Channel.prototype.close = function() {
  return this.transport.close.apply(arguments);
};
