DL.Channel.Transport.WEBSOCKETS = function(client, collection, options) {
  this.client = client;
  this.collection = collection;

  if (!options.url) {
    var scheme = window.location.protocol === 'https:' ? 'wss://' : 'ws://',
        url = client.url.replace(/https?:\/\//, scheme);

    if (url.match(/index\.php/)) {
      url = url.replace("index.php", "ws");
    } else {
      url += "ws";
    }

    options.url = url;
  }

  this.ws = new Wampy(options.url);
};

DL.Channel.Transport.WEBSOCKETS.prototype.subscribe = function(event, callback) {
  this.ws.subscribe(this.collection.name + '.' + event, callback);
};

DL.Channel.Transport.WEBSOCKETS.prototype.isConnected = function() {
  return this.ws._isInitialized && this.ws._ws.readyState === 1;
};

DL.Channel.Transport.WEBSOCKETS.prototype.unsubscribe = function(event) {
  this.ws.subscribe(this.collection.name + '.' + event);
};

DL.Channel.Transport.WEBSOCKETS.prototype.publish = function(event, message, exclude, eligible) {
  this.ws.publish(this.collection.name + '.' + event, message, exclude, eligible);
};

// DL.Channel.Transport.WEBSOCKETS.prototype.connect = function() {
// };

DL.Channel.Transport.WEBSOCKETS.prototype.disconnect = function() {
  this.ws.disconnect();
};

DL.Channel.Transport.WEBSOCKETS.prototype.close = function() {
  this.disconnect();
};
