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
