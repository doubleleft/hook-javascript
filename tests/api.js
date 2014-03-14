window.client = new DL.Client({
  url: "http://dl-api.ddll.co/",
  appId: '1',
  key: "q1uU7tFtXnLad6FIGGn2cB+gxcx64/uPoDhqe2Zn5AE="
});

test("API", function() {
  ok( client.url == "http://dl-api.ddll.co/", "url OK");
  ok( client.appId == "1", "'appId' OK");
  ok( client.key == "test", "'secret' OK");
});
