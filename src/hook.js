/**
 * @module Hook
 */

var Hook = {
  VERSION: "0.3.0",

  Events: require('./utils/events'),
  Client: require('./client'),
  Plugins: require('./plugin_manager'),

  defaults: {
    perPage: 50
  }
};

//
// Legacy browser support
//
if(typeof(window.FormData)==="undefined"){
  // IE9<: prevent crash when FormData isn't defined.
  window.FormData = function(){ this.append=function(){}; };
}

if (!window.location.origin) {
  // Support location.origin
  window.location.origin = window.location.protocol + "//" + window.location.hostname + (window.location.port ? ':' + window.location.port: '');
}

module.exports = Hook;
