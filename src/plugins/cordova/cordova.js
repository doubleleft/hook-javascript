/**
 * @module Hook.Plugin
 * @class Cordova
 */
Hook.Plugin.Cordova = function(client) {
  this.client = client;

  /**
   * @property push
   * @type Hook.Plugin.Cordova.PushNotification
   */
  this.push = new Hook.Plugin.Cordova.PushNotification(client);
};

// Register plugin
Hook.Plugin.Manager.register('cordova', Hook.Plugin.Cordova);
