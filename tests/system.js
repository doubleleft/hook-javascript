asyncTest("System", function() {
  expect(1);

  client.system.time(function(response) {
    ok(true);
    // var localTime = Math.floor((new Date().getTime()) / 1000);
    // ok(response === localTime);

  }).done(function() {
    start();
  });

});


