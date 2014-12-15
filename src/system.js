module.exports = class System {

  /**
   * @module Hook
   * @class Hook.System
   *
   * @param {Client} client
   * @constructor
   */
  constructor(client) {
    this.client = client;
  }

  /**
   * Return server's system time.
   * @method time
   * @return {Promise}
   */
  time() {
    var promise = this.client.get('system/time');
    if (arguments.length > 0) {
      promise.then.apply(promise, arguments);
    }
    return promise;
  }

}
