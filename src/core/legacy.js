// IE9<: prevent crash when FormData isn't defined.
if(typeof(window.FormData)==="undefined"){
  window.FormData = function(){ this.append=function(){}; };
}

// Support location.origin
if (!window.location.origin) {
  window.location.origin = window.location.protocol + "//" + window.location.hostname + (window.location.port ? ':' + window.location.port: '');
}
