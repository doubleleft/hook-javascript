/**
 * Iterable is for internal use only.
 * @module DL
 * @class DL.Iterable
 */
DL.Iterable = function() { };
DL.Iterable.prototype = {
  /**
   * @method each
   * @param {Function} func
   * @return {Promise}
   */
  each : function(func) { return this._iterate('each', func); },

  /**
   * @method find
   * @param {Function} func
   * @return {Promise}
   */
  find : function(func) { return this._iterate('find', func); },

  /**
   * @method filter
   * @param {Function} func
   * @return {Promise}
   */
  filter : function(func) { return this._iterate('filter', func); },

  /**
   * @method max
   * @param {Function} func
   * @return {Promise}
   */
  max : function(func) { return this._iterate('max', func); },

  /**
   * @method min
   * @param {Function} func
   * @return {Promise}
   */
  min : function(func) { return this._iterate('min', func); },

  /**
   * @method every
   * @param {Function} func
   * @return {Promise}
   */
  every : function(func, accumulator) { return this._iterate('every', func); },

  /**
   * @method reject
   * @param {Function} func
   * @return {Promise}
   */
  reject : function(func, accumulator) { return this._iterate('reject', func, accumulator); },

  /**
   * @method groupBy
   * @param {Function} func
   * @return {Promise}
   */
  groupBy : function(func, accumulator) { return this._iterate('groupBy', func, accumulator); },

  /**
   * Iterate using lodash function
   * @method _iterate
   * @param {String} method
   * @param {Function} func
   * @param {Object} argument
   * @return {Promise}
   */
  _iterate : function(method, func, arg3) {
    var that = this, deferred = when.defer();

    this.then(function(data) {
      var result = _[method].call(_, data, func, arg3);
      deferred.resolver.resolve(result);
    }).otherwise(function(err) {
      deferred.resolver.reject(err);
    });

    return deferred.promise;
  }
};
