asyncTest("Plugin: Backbone.HookCollection", function() {
  expect(1);

  Backbone.hook = client;

  var Post = Backbone.HookModel.extend({name: 'posts'});
  var PostCollection = Backbone.HookCollection.extend({
    model: Post,
    getLast: function() {
      this.remote.sort('created_at', -1).limit(5);
      this.fetchRemote();
    }
  });

  var posts = new PostCollection();
  posts.on('fetch', function(collection, response, options) {
    ok(collection);
    start();
  });
  posts.getLast();
});
