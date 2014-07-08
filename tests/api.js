window.client = new Hook.Client({
  url: "http://hook.dev/index.php/",
  appId: '1',
  key: "006f04b4f723c9920e259a746f9318be"
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
  ok( client.appId == "1", "'appId' OK");
  ok( client.key == "006f04b4f723c9920e259a746f9318be", "'secret' OK");
});
