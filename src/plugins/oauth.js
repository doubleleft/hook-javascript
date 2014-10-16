/**
 * @module Hook.Plugin
 * @class OAuth
 */
Hook.Plugin.OAuth = function(client) {
  this.client = client;
};

Hook.Plugin.OAuth.prototype.popup = function(provider) {
};

// Register plugin
Hook.Plugin.Manager.register('oauth', Hook.Plugin.OAuth);
