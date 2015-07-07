// IE9<: prevent crash when FormData isn't defined.
if(typeof(window.FormData)==="undefined"){
  window.FormData = function(){ this.append=function(){}; };
}

// Support location.origin
if (!window.location.origin) {
  window.location.origin = window.location.protocol + "//" + window.location.hostname + (window.location.port ? ':' + window.location.port: '');
}

//
// Compability with hook-javascript <0.3.4 versions
// TODO: deprecate me on 0.4
//
Promise.prototype.otherwise = function(func) {
  return this['catch'](func);
}
Promise.prototype.done = function(func) {
  this.then(func);
  this['catch'](func);
  return this;
}

