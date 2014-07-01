asyncTest("Authentication: Facebook", function() {
  expect(4);

  FB.login(function(response) {
    data = response.authResponse;
    data.additional_field = "It's possible to add new fields when registering with facebook.";
    client.auth.register('facebook', data).then(function(userdata) {
      FB.api('/me', function(me) { // match registered data with actual user info
        ok(client.auth.currentUser.email == me.email, "currentUser.email");
        ok(client.auth.currentUser.name == me.name, "currentUser.name");
        ok(client.auth.currentUser.additional_field == data.additional_field, "additional_field should be saved");
        client.auth.logout();
        ok(client.auth.currentUser == null, "logout");
        start();
      });
    });
  }, {scope: 'email'});
});
