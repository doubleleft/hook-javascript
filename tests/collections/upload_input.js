asyncTest("Files: uploading with input[type=file]", function() {
  var attached_files = client.collection('attached_files');

  $('body').append($('<input type="file" id="upload_input_file_1" />'));
  $('body').append($('<input type="file" id="upload_input_file_2" />'));

  $('body').append($('<button id="letstest">Vai lá</button>'));

  $('#letstest').click(function() {
    attached_files.create({
      file_1: $('#upload_input_file_1').get(0),
      file_2: $('#upload_input_file_2').get(0)
    }).then(function(data) {
      ok(data.file_1.match(/\.pdf/)[0] === ".pdf");
      ok(data.file_1_id >= 0, "file_1_id should be present");

      ok(data.file_2.match(/\.pdf/)[0] === ".pdf");
      ok(data.file_2_id >= 0, "file_1_id should be present");

    }).done(function() {
      start();

    });
  })

});

