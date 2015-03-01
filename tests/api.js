test("API", function() {
  window.ascii_rand = function(length) {
    var str = "";
    for (var i=0; i < length; i++) {
      var charCode = 97 + Math.floor((Math.random() * 25));
      str += String.fromCharCode(charCode);
    }
    return str; //  + ((new Date()).getTime().toString().substr(8))
  }

  ok( client.endpoint == "http://hook.dev/index.php/", "endpoint OK");
  ok( client.app_id == appData.keys[1].app_id, "'app_id' OK");
  ok( client.key == appData.keys[1].key, "'secret' OK");
});
