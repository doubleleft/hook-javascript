/**
 * @module DL.Plugin
 * @class Cordova
 */
DL.Plugin.Cordova = function(client) {
  this.client = client;

  /**
   * @property push
   * @type DL.Plugin.Cordova.PushNotification
   */
  this.push = new DL.Plugin.Cordova.PushNotification(client);
};

// Register plugin
DL.Plugin.Manager.register('cordova', DL.Plugin.Cordova);
