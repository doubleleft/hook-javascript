/**
 * @module Hook.Plugin
 * @class OAuth
 *
 * @requires winchan ~ac4b142c
 */
HookOAuth = function(client) {
  this.client = client;
};

HookOAuth.prototype.popup = function(provider, windowFeatures) {
  var self = this,
      href = this.client.url + "oauth/" + provider + this.client.getCredentialsParams(),
      href_relay = this.client.url + "oauth/relay_frame" + this.client.getCredentialsParams(),
      deferred = when.defer();

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

    if (err && r == "closed window") {
      deferred.resolver.reject("canceled");
    }
  });

  return deferred.promise;
};

// Register plugin
Hook.Plugins.register('oauth', HookOAuth);
