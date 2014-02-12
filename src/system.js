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
