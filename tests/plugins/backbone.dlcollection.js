asyncTest("Plugin: Backbone.DLCollection", function() {
  expect(1);

  Backbone.dlapi = client;

  var Post = Backbone.DLModel.extend({name: 'posts'});
  var PostCollection = Backbone.DLCollection.extend({
    model: Post,
    getLast: function() {
      this.remote.sort('created_at', -1).limit(5);
      this.fetchRemote();
    }
  });

  var posts = new PostCollection();
  posts.on('fetch', function(collection, response, options) {
    console.log("Fetch: ", collection, response, options);
  });
  posts.getLast();
});
