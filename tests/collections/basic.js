var posts = client.collection('posts');
var past_time = Math.round(((new Date).getTime() - 2000) / 1000);

asyncTest("Collections: create", function() {
  expect(1);

  //
  // Create
  //
  posts.create({title: "My awesome blog post", content: "Lorem ipsum dolor sit amet."}).then(function(response) {
    ok(response.title ==  "My awesome blog post", "CREATE");
  }, function(response) {
    ok(false, "CREATE first row");

  }).done(function() {
    start();
  });
});


asyncTest("Collections: create with data types", function() {
  expect(4);

  posts.create({string: "Another post", int: 5, float: 9.9, bool: true}).then(function(response) {
    ok(response.string ==  "Another post", "CREATE keep string data-type");
    ok(response.int == 5, "CREATE keep integer data-type");
    ok(response.float == 9.9, "CREATE keep float data-type");
    ok(response.bool === true, "CREATE keep boolean data-type");
  }, function(response) {
    ok(false, "CREATE with more fields");

  }).done(function() {
    start();
  });
});

asyncTest("Collections: listing without where", function() {
  //
  // Get without where
  //
  posts.get().then(function(response) {
    ok(response.length > 0, "LIST WITHOUT where");
  }, function(response) {
    ok(false, "LIST WITHOUT where");
  }).done(function() {
    start();
  });

});
