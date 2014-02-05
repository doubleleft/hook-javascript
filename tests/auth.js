asyncTest("Authentication", function() {
  expect(3);

  client.auth.register('email', {
    email: "edreyer@doubleleft.com",
    name: "Endel Dreyer"
  }).then(function(response) {
    ok(client.auth.currentUser.email == "edreyer@doubleleft.com", "currentUser.email");
    ok(client.auth.currentUser.name == "Endel", "currentUser.name");

    client.auth.logout();
    ok(client.auth.currentUser == null, "logout");
    start();
  });

});
