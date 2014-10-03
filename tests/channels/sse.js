asyncTest("Channels: Server-Sent Events", function() {
  expect(2);

  var messages = client.channel('messages');
  messages.subscribe(function(event, message) {
    console.log("message: ", event,  message)
  }).then(function() {
    messages.publish('event-name', {
      data: 'message-data'
    });
  });


});
