/**
 * @module Hook.Plugin
 * @class OAuth
 *
 * @requires winchan ~ac4b142c
 */
Hook.Plugin.OAuth = function(client) {
  this.client = client;
};

Hook.Plugin.OAuth.prototype.popup = function(provider, options) {
  var self = this,
      href = this.client.url + "oauth/" + provider + "?X-App-Id=" + this.client.app_id + "&X-App-Key=" + this.client.key,
      href_relay = this.client.url + "oauth/relay_frame" + "?X-App-Id=" + this.client.app_id + "&X-App-Key=" + this.client.key,
      deferred = when.defer();

  href += "&" + this.client.serialize({options: options});

  // auto-resolve promise when user is already logged in.
  if (this.client.auth.currentUser) {
    deferred.resolver.resolve(this.client.auth.currentUser);

  } else {
    WinChan.open({
      url: href,
      relay_url: href_relay,
      window_features: "menubar=0,location=0,resizable=0,scrollbars=0,status=0,dialog=1,width=700,height=375",
    }, function(err, r) {
      // err is a string on failure, otherwise r is the response object

      if (!err && r) {
        // register user token
        self.client.auth._registerToken(r);

        // resolve oauth promise
        deferred.resolver.resolve(r);
      }

      if (err && err == "unknown closed window") {
        deferred.resolver.reject("canceled");
      }
    });
  }

  return deferred.promise;
};

// Register plugin
Hook.Plugin.Manager.register('oauth', Hook.Plugin.OAuth);
