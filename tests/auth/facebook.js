asyncTest("Authentication: Facebook", function() {
  expect(3);

  FB.login(function(response) {
    client.auth.authenticate('facebook', response.authResponse).then(function(userdata) {
      FB.api('/me', function(me) { // match registered data with actual user info
        ok(client.auth.currentUser.email == me.email, "currentUser.email");
        ok(client.auth.currentUser.name == me.name, "currentUser.name");
        client.auth.logout();
        ok(client.auth.currentUser == null, "logout");
        start();
      });
    });
  }, {scope: 'email'});
});

