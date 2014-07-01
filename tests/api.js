window.client = new DL.Client({
  url: "http://dl-api.dev/index.php/",
  appId: '1',
  key: "4c5f2f5ed5cebe26955829ab948128fc"
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
  ok( client.url == "http://dl-api.dev/index.php/", "url OK");
  ok( client.appId == "1", "'appId' OK");
  ok( client.key == "4c5f2f5ed5cebe26955829ab948128fc", "'secret' OK");
});
