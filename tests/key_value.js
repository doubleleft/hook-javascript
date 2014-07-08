asyncTest("Key-value: set", function() {
  expect(1);

  client.keys.set('something', 'data').then(function(data) {
    ok(data.value == "data", "SET");
  }).done(function() {
    start();
  });

});

asyncTest("Key-value: get", function() {
  expect(1);

  client.keys.get('something').then(function(data) {
    ok(true, "GET");
  }).done(function() {
    start();
  });


});

