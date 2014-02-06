asyncTest("Authentication: Email", function() {
  expect(3);

  client.auth.authenticate('email', {
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
