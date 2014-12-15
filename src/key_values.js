module.exports = class KeyValues {

  /**
   * @module Hook
   * @class Hook.KeyValues
   *
   * @param {Hook.Client} client
   * @constructor
   */
  constructor(client) {
    this.client = client;
  }

  /**
   * @method get
   * @param {String} key
   * @param {Function} callback
   * @return {Promise}
   *
   * @example Get a key value
   *
   *     client.keys.get('my-custom-key', function(key) {
   *       console.log(key.value);
   *     });
   */
  get(key, callback) {
    var promise = this.client.get('key/' + key);
    if (callback) {
      promise.then.apply(promise, [callback]);
    }
    return promise;
  }

  /**
   * @method set
   * @param {String} key
   * @param {String|Number} value
   * @return {Promise}
   *
   * @example Set a key value
   *
   *     client.keys.set('my-custom-key', 'custom value').then(function(key) {
   *       console.log(key);
   *     });
   */
  set(key, value) {
    return this.client.post('key/' + key, { value: value });
  }

}
