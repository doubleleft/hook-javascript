asyncTest("Files: uploading base64-encoded files with collections", function() {
  var attached_files = client.collection('attached_files');

  $.get('fixtures/base64_jpg.txt').then(function(base64) {
    attached_files.create({
      file: "data:image/jpeg;base64," + base64
    }).then(function(data) {
      ok(data.file.match(/\.jpeg$/)[0] === ".jpeg");
      ok(data.file_id >= 0, "file_id should be present");

    }).done(function() {
      start();

    });

  })
});
