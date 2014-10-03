asyncTest("Plugin: Backbone.HookModel", function() {
  expect(1);

  Backbone.hook = client;

  var Post = Backbone.HookModel.extend({name: "posts"});
  var entry = new Post({
    title: "I'm a Backbone model",
    description: "Syncing with dl-api."
  });

  entry.on('saving', function(model) {
    console.log("Saving...");
  });

  entry.on('created', function(model) {
    console.log("Created!");

    // After create, let's just update...
    entry.set('title', "Changing title...");
    entry.save();
  });

  entry.on('saved', function(model) {
    console.log("Saved!");
  });

  entry.save();
});
