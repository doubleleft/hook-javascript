asyncTest("Authentication: Email login (success)", function() {
  expect(6);

  ok(client.auth.isLogged() == false, "isLogged should be false");

  // register dummy user first
  var email = ascii_rand(8) + "@" + ascii_rand(5) + ".com";
  client.auth.register({
    email: email,
    name: "Endel Dreyer",
    password: "teste"
  }).done(function() {
    ok(client.auth.isLogged() == true, "isLogged should be true");

    client.auth.logout();
    ok(client.auth.currentUser == null, "should have clean session before login");

    // test for successful login
    client.auth.login({
      email: email,
      name: "Endel Dreyer",
      password: "teste"
    }).then(function(response) {
      ok(client.auth.currentUser.email == email, "currentUser.email");
      ok(client.auth.currentUser.name == "Endel Dreyer", "currentUser.name");

      client.auth.logout();
      ok(client.auth.currentUser == null, "logout");

    }).done(function() {
      start();
    });

  });
});

asyncTest("Authentication: Email login (error)", function() {
  expect(1);

  // register dummy user first
  var email = ascii_rand(8) + "@" + ascii_rand(5) + ".com";
  client.auth.register({
    email: email,
    name: "Endel Dreyer",
    password: "teste"
  }).done(function() {

    var promise = client.auth.login({
      email: "edreyer@doubleleft.com",
      name: "Endel Dreyer",
      password: "i'm using the wrong password here"
    }).then(function(response) {
      ok(false, "shouldn't login with invalid password");
      start();

    }, function(response) {
      ok(typeof(response.error)=="string", "Password invalid");

    }).done(function() {
      start();
    });


  });

});
