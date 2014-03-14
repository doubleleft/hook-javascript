asyncTest("Files: Uploading with collections", function() {
  var attached_files = client.collection('attached_files');

  $.get('fixtures/base64_jpg.txt').then(function(base64) {
    console.log("data:image/jpeg;base64," + base64);

    attached_files.create({
      file: { base64: base64, mime: "image/jpg" }
    }).then(function(data) {

    });

  })
});
