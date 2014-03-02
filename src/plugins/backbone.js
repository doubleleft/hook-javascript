(function(window) {
  /**
   * @namespace Backbone
   */

  /**
   * @class DLModel
   */
  Backbone.DLModel = Backbone.Model.extend({
    idAttribute: '_id',
    initialize: function() {
      if (!this.name) {
        throw new Exception("DL.Backbone.Model.extend: 'name' required.");
      }
      this.remote = Backbone.dlapi.collection(this.name);
      this._sync = {};
      this.on('request', this._onBeforeSync);
      this.on('sync', this._onSync);
    },

    _onBeforeSync: function(model, response, options) {
      this._sync.isNew = this.isNew();
      if (this._sync.isNew && !model.get('_id')) {
        this.trigger('creating', model);
      }
      this.trigger('saving', model, response, options);
    },

    _onSync: function(model, response, options) {
      if (typeof(options.attrs._id)==='undefined' && this._sync.isNew && model.get('_id')) {
        this.trigger('created', model);
      }
      this.trigger('saved', model, response, options);
    },

    url: function() {
      return Backbone.dlapi.url + this.remote.segments;
    }
  });

  /**
   * @class DLCollection
   */
  Backbone.DLCollection = Backbone.Collection.extend({
    initialize: function() {
      if (!this.model) {
        throw new Exception("DL.Collection.extend: 'model' required.");
      }

      var model = new this.model();
      this.remote = Backbone.dlapi.collection(model.name);
    },

    /**
     * Reset collection data and triggers 'fetch' event.
     * @method fetchRemote
     * @param {Array} models
     */
    fetchRemote: function(collection) {
      var that = this;
      this.remote.then(function(models) {
        that.reset(models);
        that._onFetch(that, models, {});
      })
    },

    fetch: function(options) {
      if (typeof(options)==='undefined') {
        options = {};
      }
      options.data = this.remote.buildQuery();
      options.success = this._onFetch;
      return Backbone.Collection.prototype.fetch.apply(this, [options]);
    },

    _onFetch: function(collection, response, options) {
      collection.trigger('fetch', collection, response, options);
    },

    url: function() {
      return Backbone.dlapi.url + this.remote.segments;
    }
  });

  var _super = Backbone.sync;
  Backbone.sync = function(method, model, options) {
    options.beforeSend = function (xhr) {
      var name, headers = Backbone.dlapi.getHeaders();
      for(name in headers) {
        xhr.setRequestHeader(name, headers[name]);
      }
    };

    options.contentType = 'application/json';
    if (options.data) {
      options.data = encodeURIComponent(JSON.stringify(options.data));
    }

    options.attrs = {
      data: model.toJSON()
    };

    if (options.attrs.data._id) {
      options.attrs.q = [ ['_id', '=', options.attrs.data._id] ];
      delete options.attrs.data._id;
      delete options.attrs.data.created_at;
      delete options.attrs.data.updated_at;
    }

    _super(method, model, options);
  };
})(window);
