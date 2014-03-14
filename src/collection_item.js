/**
 * @module DL
 * @class DL.CollectionItem
 *
 * @param {DL.Collection} collection
 * @param {Number|String} _id
 * @constructor
 */
DL.CollectionItem = function(collection, _id) {
  this.collection = collection;

  this.name = this._validateName(name);
  this.reset();

  this.segments = 'collection/' + this.name;
};

