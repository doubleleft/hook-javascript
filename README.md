hook-javascript client
===

JavaScript client for [hook](https://github.com/doubleleft/hook).

- [Documentation](http://doubleleft.github.io/hook-javascript/classes/Hook.Client.html).
- [Plugins](https://github.com/doubleleft/hook-javascript/wiki/Plugins).

How to use
---

Initialize with your app's credentials:

```javascript
var hook = new Hook.Client({
  url:   "http://local-or-remote-hook.com/index.php/",
  appId: 1,    // your app's id
  key: 'test'  // your app's public key
});
```

Creating collection entries:

```javascript
hook.collection('posts').create({
  title: "Post name",
  summary: "My awesome new post",
  stars: 5
});
```

Filtering:

```javascript
hook.collection('posts').where('stars', '>=', 5).then(function(data) {
  console.log(data);
});
```

View full documentation [here](http://doubleleft.github.io/hook-javascript/classes/Hook.Client.html).

How to build
---

You'll need [nodejs](http://nodejs.org/) installed first. Then run the following
commands:

    $ npm install -g grunt-cli bower
    $ npm install
    $ bower install
    $ grunt


API Docs
---

For a more complete documentation, check the [API reference](http://doubleleft.github.io/hook-javascript/).

To build and publish the docs:

```bash
make publish-docs
```

License
---

MIT
