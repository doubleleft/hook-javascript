asyncTest("Authentication: Forgot password (send)", function() {
  expect(1);

  var email = ascii_rand(8) + "@" + ascii_rand(5) + ".com";

  // register dummy user
  client.auth.register({
    email: email,
    name: "Endel Dreyer",
    password: "teste"
  }).then(function(response) {
    client.auth.logout();

    // test forgot password
    client.auth.forgotPassword({
      subject: "Project name: Forgot your password?",
      email: email,
    }).then(function(data) {
      ok(true);
    }, function(data) {
      ok(false, data.error);
    }).done(function() {
      start();
    });

  });

});

asyncTest("Authentication: Forgot password (user not found)", function() {
  expect(1);

  // test forgot password
  client.auth.forgotPassword({
    subject: "Project name: Forgot your password?",
    email: "somebody@inexistent.com",
  }).then(function(data) {
    ok(false);
  }, function(data) {
    ok(typeof(data.error)==="string", "Should return 'user not found' error.");
  }).done(function() {
    start();
  });

});
