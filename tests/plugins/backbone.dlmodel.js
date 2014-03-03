asyncTest("Plugin: Backbone.DLModel", function() {
  expect(1);
  var dl = new DL.Client({
    url: 'http://dl-api.dev/api/index.php/',
    appId: 5,
    key: "567dca583723adc1ec8bfceaddc52ddf"
  });
  Backbone.dlapi = dl;

  var Post = Backbone.DLModel.extend({name: "posts"});
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
