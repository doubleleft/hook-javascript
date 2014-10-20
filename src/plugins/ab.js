var AB = function(client) {
  this.client = client;
};

// Register plugin
Hook.Plugin.Manager.register('AB', AB);
