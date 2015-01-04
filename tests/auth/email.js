asyncTest("Auth: register by email", function() {
  expect(5);

  ok(client.auth.isLogged() == false, "isLogged should be false");

  var email = ascii_rand(8) + "@" + ascii_rand(5) + ".com";

  client.auth.register({
    email: email,
    name: "Endel Dreyer",
    password: "teste"

  }).then(function(response) {
    ok(client.auth.currentUser.email == email, "currentUser.email");
    ok(client.auth.currentUser.name == "Endel Dreyer", "currentUser.name");
    // ok(client.auth.currentUser.password == "teste", "currentUser.password");

    ok(client.auth.isLogged() == true, "isLogged should be true");

    client.auth.logout();
    ok(client.auth.currentUser == null, "logout");

  }).done(function() {
    start();

  });

});
