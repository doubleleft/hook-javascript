asyncTest("Plugin: Backbone.HookModel", function() {
  expect(1);

  Backbone.hook = client;

  var Post = Backbone.HookModel.extend({name: "posts"});
  var entry = new Post({
    title: "I'm a Backbone model",
    content: "Syncing with hook."
  });

  entry.on('created', function(model) {
    ok(model.attributes.title == "I'm a Backbone model", "callback on 'created'");
    start();
  });

  entry.save();
});
