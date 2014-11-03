window.client = new Hook.Client({
  url: "http://hook.dev/public/index.php/",
  app_id: '25',
  key: "8780fea8cd576294fa328cdca058de63"
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
  ok( client.url == "http://hook.dev/public/index.php/", "url OK");
  ok( client.app_id == "25", "'app_id' OK");
  ok( client.key == "8780fea8cd576294fa328cdca058de63", "'secret' OK");
});
