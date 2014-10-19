/**
 * @module Hook.Plugin
 * @class OAuth
 */
Hook.Plugin.OAuth = function(client) {
  this.client = client;
};

Hook.Plugin.OAuth.prototype.popup = function(provider, windowFeatures) {
  var popup,
      self = this,
      success = false,
      allowedHost = this.client.url.match(/https?:\/\/[^\/]+/)[0],
      href = this.client.url + "oauth/" + provider,
      deferred = when.defer();

  href += "?X-App-Id=" + this.client.app_id + "&X-App-Key=" + this.client.key;
  href += "&popup=1";

  var messageListener = function(event) {
    if (event.origin !== allowedHost)
      return;

    success = true;
    popup.close();

    // register user token
    self.client.auth._registerToken(event.data);

    // resolve oauth promise
    deferred.resolver.resolve(event.data);
  };

  // register window postMessage listener
  this.addListener("message", messageListener, false);

  popup = window.open(href, '_blank', 'height=600,width=600');
  popup.onbeforeunload = function() {
    if (!success && popup.location.href.indexOf(allowedHost) === -1) {
      // user canceled the action
      deferred.resolver.reject("canceled");
      self.removeListener("message", messageListener, false);
    }
  }

  return deferred.promise;
};

if (typeof window.addEventListener === 'function') {
  // W3C Standard
  Hook.Plugin.OAuth.prototype.addListener = function(eventType, listener, useCapture) {
    window.addEventListener(eventType, listener, useCapture);
  };
  Hook.Plugin.OAuth.prototype.removeListener = function(eventType, listener, useCapture) {
    window.removeEventListener(eventType, listener, useCapture);
  };

} else if (typeof window.attachEvent === 'function') {
  // MSIE
  Hook.Plugin.OAuth.prototype.addListener = function(eventType, listener, useCapture) {
    window.attachEvent('on'+eventType, listener, useCapture);
  };
  Hook.Plugin.OAuth.prototype.removeListener = function(eventType, listener, useCapture) {
    window.detachEvent('on'+eventType, listener, useCapture);
  };
}

// Register plugin
Hook.Plugin.Manager.register('oauth', Hook.Plugin.OAuth);
