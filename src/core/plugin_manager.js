/**
 * @module Hook
 * @class Hook.PluginManager
 * @constructor
 * @static
 */
Hook.Plugin = {};
Hook.Plugin.Manager = { plugins: [] };

/**
 * Register plugin to be instantiated on Hook.Client
 * @method register
 * @param {Object} class
 * @static
 */
Hook.Plugin.Manager.register = function(path, klass) {
  this.plugins.push({ path: path, klass: klass });
};

/**
 * Register all plugins on target Hook.Client
 * @method setup
 * @param {Hook.Client} client
 * @static
 */
Hook.Plugin.Manager.setup = function(client) {
  for (var i=0, l = this.plugins.length; i < l; i++) {
    client[ this.plugins[i].path ] = new this.plugins[i].klass(client);
  }
};
