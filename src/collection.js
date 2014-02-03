/**
 * @class DL.Collection
 *
 * @param {DL.Client} client
 * @param {String} name
 * @constructor
 */
DL.Collection = function(client, name) {
  this.client = client;

  this.name = this._validateName(name);
  this.reset();

  var custom_collections = ['files'];
  this.segments = (custom_collections.indexOf(this.name) !== -1) ? this.name : 'collection/' + this.name;
};

// Inherits from DL.Iterable
DL.Collection.prototype = new DL.Iterable();
DL.Collection.prototype.constructor = DL.Collection;

/**
 * Create a new resource
 * @method create
 * @param {Object} data
 * @return {DL.Collection} this
 *
 * @example Creating an entry
 *
 *     client.collection('posts').create({
 *       title: "Post name",
 *       summary: "My awesome new post",
 *       stars: 5
 *     });
 *
 * @example Listening to complete event
 *
 *     // Verbose way
 *     var c = client.collection('posts');
 *     var promise = c.create({ title: "Post name", summary: "Something", stars: 5 });
 *     promise.then(function(data) {
 *         console.log(data);
 *     });
 *
 *     // Short way
 *     client.collection('posts').create({ title: "Post name", summary: "Something", stars: 5 }).then(function(data) {
 *         console.log(data);
 *     });
 *
 */
DL.Collection.prototype.create = function(data) {
  return this.client.post(this.segments, { data: data });
};

/**
 * Get collection data, based on `where` params.
 * @method get
 * @return {DL.Collection} this
 */
DL.Collection.prototype.get = function(options) {
  return this.client.get(this.segments, this.buildQuery(options));
};

/**
 * Add `where` param
 * @param {Object | String} where params or field name
 * @param {String} operation operation or value
 * @param {String} value value
 * @return {DL.Collection} this
 *
 * @example Multiple 'where' calls
 *
 *     var c = client.collection('posts');
 *     c.where('author','Vicente'); // equal operator may be omitted
 *     c.where('stars','>',10);     // support '<' and '>' operators
 *     c.then(function(result) {
 *       console.log(result);
 *     });
 *
 * @example One 'where' call
 *
 *     client.collection('posts').where({
 *       author: 'Vicente',
 *       stars: ['>', 10]
 *     }).then(function(result) {
 *       console.log(result);
 *     })
 *
 */
DL.Collection.prototype.where = function(objects, _operation, _value) {
  var field,
      operation = (typeof(_value)==="undefined") ? '=' : _operation,
      value = (typeof(_value)==="undefined") ? _operation : _value;

  if (typeof(objects)==="object") {
    for (field in objects) {
      if (objects.hasOwnProperty(field)) {
        if (objects[field] instanceof Array) {
          operation = objects[field][0];
          value = objects[field][1];
        } else {
          value = objects[field];
        }
        this.addWhere(field, operation, value);
      }
    }
  } else {
    this.addWhere(objects, operation, value);
  }

  return this;
};

/**
 * Query only the first result
 * @method first
 *
 * @example Return just the first element for current query
 *
 *     client.collection('users').sort('created_at', -1).first(function(data) {
 *       console.log("Last created user:", data);
 *     });
 */
DL.Collection.prototype.first = function() {
  var promise = this.get({first: true});
  promise.then.apply(promise, arguments);
  return promise;
};

/**
 * Alias for get & then
 * @method then
 */
DL.Collection.prototype.then = function() {
  var promise = this.get();
  promise.then.apply(promise, arguments);
  return promise;
};

/**
 * Clear collection filtering state
 * @method reset
 * @return {DL.Collection} this
 */
DL.Collection.prototype.reset = function() {
  this.wheres = [];
  this.ordering = [];
  this._limit = null;
  this._offset = null;
  return this;
};

/**
 * @method sort
 * @param {String} field
 * @param {Number|String} direction
 * @return {DL.Collection} this
 *
 * @example Return just the first element for current query
 *
 *     // Ommit the second argument for ascending order:
 *     client.collection('users').sort('created_at').then(function(data){ });
 *
 *     // Use 1 or 'asc' to specify ascending order:
 *     client.collection('users').sort('created_at', 1).then(function(data){  });
 *     client.collection('users').sort('created_at', 'asc').then(function(data){  });
 *
 *     // Use -1 or 'desc' for descending order:
 *     client.collection('users').sort('created_at', -1).then(function(data) {  });
 *     client.collection('users').sort('created_at', 'desc').then(function(data) {  });
 */
DL.Collection.prototype.sort = function(field, direction) {
  if (!direction) {
    direction = "asc";
  } else if (typeof(direction)==="number") {
    direction = (parseInt(direction, 10) === -1) ? 'desc' : 'asc';
  }
  this.ordering.push([field, direction]);
  return this;
};

/**
 * @method limit
 * @param {Number} int
 * @return {DL.Collection} this
 *
 * @example Limit the number of rows to retrieve
 *
 *     client.collection('posts').sort('updated_at', -1).limit(5).then(function(data) {
 *       console.log("Last 5 rows updated: ", data);
 *     });
 *
 * @example Limit and offset
 *
 *     client.collection('posts').sort('updated_at', -1).limit(5).offset(5).then(function(data) {
 *       console.log("last 5 rows updated, after 5 lastest: ", data);
 *     });
 */
DL.Collection.prototype.limit = function(int) {
  this._limit = int;
  return this;
};

/**
 * @method offset
 * @see limit
 *
 * @param {Number} int
 * @return {DL.Collection} this
 */
DL.Collection.prototype.offset = function(int) {
  this._offset = int;
  return this;
};

/**
 * Stream
 * @method stream
 * @param {Object|Function} callback_or_bindings
 * @return {DL.Stream}
 *
 * @example Streaming collection data
 *
 *     client.collection('messages').where('type', 'new-game').stream(function(data) {
 *       console.log("Received new-game message: ", data);
 *     });
 *
 *     client.collection('messages').create({type: 'sad', text: "i'm sad because streaming won't catch me"});
 *     client.collection('messages').create({type: 'new-game', text: "yey, streaming will catch me!"});
 *
 * @example Getting only newly updated items from collection
 *
 *     client.collection('messages').stream({
 *       from_now: true,
 *       message: function(data) {
 *         console.log("Just created/updated:", data);
 *       }
 *     });
 *
 * @example Setting custom timeout configs
 *
 *     client.collection('messages').stream({
 *       retry_timeout: 10,   // re-open streaming after 10 seconds
 *       refresh_timeout: 2,  // refresh streaming data every 2 seconds
 *       message: function(data) {
 *         console.log("Just created/updated:", data);
 *       }
 *     });
 *
 */
DL.Collection.prototype.stream = function(bindings) {
  return new DL.Stream(this, bindings);
};

/**
 * @method paginate
 * @return {DL.Pagination}
 *
 * @param {Mixed} perpage_or_callback
 * @param {Function} callback
 */
DL.Collection.prototype.paginate = function(perPage, callback) {
  var pagination = new DL.Pagination(this);

  if (!callback) {
    callback = perPage;
    perPage = DL.defaults.perPage;
  }

  this.get({paginate: perPage}).then(function(data) {
    pagination._fetchComplete(data);
    if (callback) { callback(pagination); }
  });

  return pagination;
};

/**
 * Count the number of items on this collection
 * @param {Function} callback [optional]
 * @return {Promise} this
 *
 * @example Count the elements of the current query
 *
 *     client.collection('posts').where('author','Vicente').count(function(total) {
 *       console.log("Total:", total);
 *     });
 */
DL.Collection.prototype.count = function() {
  var promise = this.client.get(this.segments + "/count");
  promise.then.apply(promise, arguments);
  return promise;
};

/**
 * Drop entire collection. This operation is irreversible.
 * @return {Promise}
 */
DL.Collection.prototype.drop = function() {
  return this.client.delete(this.segments);
};

/**
 * Remove a single row by id
 * @param {String} id
 * @return {Promise}
 *
 * @example Deleting a row by id
 *
 *     client.collection('posts').delete(1).then(function(data) {
 *       console.log("Success:", data.success);
 *     });
 */
DL.Collection.prototype.delete = function(_id) {
  return this.client.delete(this.segments + '/' + _id);
};

/**
 * Update a single collection entry
 * @param {Number | String} _id
 * @param {Object} data
 *
 * @example Updating a single row
 *
 *     client.collection('posts').update(1, { title: "Changing post title" }).then(function(data) {
 *       console.log("Success:", data.success);
 *     });
 */
DL.Collection.prototype.update = function(_id, data) {
  return this.client.post(this.segments + '/' + _id, { data: data });
};

/**
 * Update all collection's data based on `where` params.
 * @param {Object} data
 */
DL.Collection.prototype.updateAll = function(data) {
  throw new Error("Not implemented.");
};

DL.Collection.prototype.addWhere = function(field, operation, value) {
  this.wheres.push([field, operation, value]);
  return this;
};

DL.Collection.prototype._validateName = function(name) {
  var regexp = /^[a-z]+$/;

  if (!regexp.test(name)) {
    throw new Error("Invalid name: " + name);
  }

  return name;
};

DL.Collection.prototype.buildQuery = function(options) {
  var query = {};

  // apply limit / offset
  if (this._limit !== null) { query.limit = this._limit; }
  if (this._offset !== null) { query.offset = this._offset; }

  // apply wheres
  if (this.wheres.length > 0) {
    query.q = this.wheres;
  }

  // apply ordering
  if (this.ordering.length > 0) {
    query.s = this.ordering;
  }

  // clear wheres/ordering for future calls
  this.reset();

  if (typeof(options)!=="undefined") {
    if (options.paginate) {
      query.p = options.paginate;
    }

    if (options.first) {
      query.f = 1;
    }
  }

  return query;
};

