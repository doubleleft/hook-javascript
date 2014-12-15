var HookAB = function(client) {
  this.client = client;
};

// Register plugin
Hook.Plugins.register('AB', HookAB);
