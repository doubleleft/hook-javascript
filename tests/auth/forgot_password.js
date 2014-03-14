asyncTest("Authentication: Forgot password (send)", function() {
  expect(1);

  client.auth.forgotPassword({
    subject: "Project name: Forgot your password?",
    email: "edreyer@doubleleft.com",
  }).then(function(data) {
    ok(true);
    start();
  }, function(data) {
    ok(false, data.error);
    start();
  });
});

asyncTest("Authentication: Forgot password (user not found)", function() {
  expect(1);

  client.auth.forgotPassword({
    subject: "Project name: Forgot your password?",
    email: "somebody@inexistent.com",
  }).then(function(data) {
    ok(false);
    start();
  }, function(data) {
    ok(data.error.indexOf('user not found') >= 0, "Should return 'user not found' error.");
    start();
  });
});
