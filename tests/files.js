asyncTest("Files", function() {
  expect(1);

  var canvas = document.createElement("canvas");
  client.files.upload(canvas, "image.png").then(function(response){
    ok(response.name === "image.png");
    start();
  });
});


