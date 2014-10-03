window.client = new Hook.Client({
  url: "http://hook.dev/index.php/",
  app_id: '1',
  key: "59599df42f7d54663b74a0b18828be05"
});

window.ascii_rand = function(length) {
  var str = "";
  for (var i=0; i < length; i++) {
    var charCode = 97 + Math.floor((Math.random() * 25));
    str += String.fromCharCode(charCode);
  }
  return str; //  + ((new Date()).getTime().toString().substr(8))
}

test("API", function() {
  ok( client.url == "http://hook.dev/index.php/", "url OK");
  ok( client.app_id == "1", "'app_id' OK");
  ok( client.key == "59599df42f7d54663b74a0b18828be05", "'secret' OK");
});
