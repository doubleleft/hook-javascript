/**
 * @module Hook
 * @class Hook.Pagination
 *
 * @param {Hook.Collection} collection
 * @param {Number} perPage
 * @constructor
 */
Hook.Pagination = function(collection) {
  this.fetching = true;

  /**
   * @property collection
   * @type {Hook.Collection}
   */
  this.collection = collection;
};

Hook.Pagination.prototype._fetchComplete = function(response) {
  this.fetching = false;

  /**
   * @property total
   * @type {Number}
   */
  this.total = response.total;

  /**
   * @property per_page
   * @type {Number}
   */
  this.per_page = response.per_page;

  /**
   * @property current_page
   * @type {Number}
   */
  this.current_page = response.current_page;

  /**
   * @property last_page
   * @type {Number}
   */
  this.last_page = response.last_page;

  /**
   * @property from
   * @type {Number}
   */
  this.from = response.from;

  /**
   * @property to
   * @type {Number}
   */
  this.to = response.to;

  /**
   * @property items
   * @type {Object}
   */
  this.items = response.data;
};

/**
 * @method hasNext
 * @return {Boolean}
 */
Hook.Pagination.prototype.hasNext = function() {
  return (this.current_page < this.to);
};

/**
 * @method isFetching
 * @return {Booelan}
 */
Hook.Pagination.prototype.isFetching = function() {
  return this.fetching;
};

Hook.Pagination.prototype.then = function() {
};
