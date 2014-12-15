var plugins = [];

/**
 * @module Hook
 * @class Hook.PluginManager
 */

class PluginManager {

  /**
   * Setup registered plugins on client instance
   * @method setup
   * @param {Hook.Client} client
   * @static
   */
  static setup(client) {
    for (var i=0, l = plugins.length; i < l; i++) {
      client[ this.plugins[i].path ] = new plugins[i].klass(client);
    }
  }

  /**
   * Register plugin to be instantiated on Hook.Client
   * @method register
   * @param {Object} class
   * @static
   */
  static register(path, klass) {
    plugins.push({ path: path, klass: klass });
  }

}

module.exports = PluginManager;
