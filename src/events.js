/**
 * @class DL.Events
 */
DL.Events = function(client) {
  this.client = client;
  this.events = {};
};

DL.Events.prototype.on = function(event, callback, context) {
  if (!this.events[event]) { this.events[event] = []; }
  this.events[event].push({callback: callback, context: context});
};

DL.Events.prototype.trigger = function(event, data) {
  var c, args = arguments.slice(1);
  if (this.events[event]) {
    for (var i=0,length=this.events[event].length;i<length;i++)  {
      c = this.events[event][i];
      c.callback.apply(c.context || this.client, args);
    }
  }
};
