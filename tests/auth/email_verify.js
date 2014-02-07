asyncTest("Authentication: Email verify (success)", function() {
  expect(3);

  client.auth.verify('email', {
    email: "edreyer@doubleleft.com",
    name: "Endel Dreyer",
    password: "teste"
  }).then(function(response) {
    ok(client.auth.currentUser.email == "edreyer@doubleleft.com", "currentUser.email");
    ok(client.auth.currentUser.name == "Endel Dreyer", "currentUser.name");

    client.auth.logout();
    ok(client.auth.currentUser == null, "logout");
    start();
  });

});

asyncTest("Authentication: Email verify (error)", function() {
  expect(1);

  var promise = client.auth.verify('email', {
    email: "edreyer@doubleleft.com",
    name: "Endel Dreyer",
    password: "lalalalala"
  }).then(function(response) {
    console.log(response);
    ok(false);
    start();

  }, function(response) {
    ok(typeof(response.error)=="string", "Password invalid");
    start();
  });
});
