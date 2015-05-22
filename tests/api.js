test("API", function() {
  ok( client.endpoint == "http://hook.dev/index.php/", "endpoint OK");
  ok( client.app_id == appData.keys[1].app_id, "'app_id' OK");
  ok( client.key == appData.keys[1].key, "'secret' OK");
});
