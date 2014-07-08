hook-javascript client
===

hook javascript client.

How to use
---

Hook.Client is the entry-point for using hook.

You should instantiate a global javascript client for consuming hook.

```javascript
window.hook = new Hook.Client({
  url:   "http://local-or-remote-hook.com/index.php/",
  appId: 1,    // your app's id
  key: 'test'  // your app's public key
});
```

After that, you're free to instantiate collections

```javascript
hook.collection('posts').create({
  title: "Post name",
  summary: "My awesome new post",
  stars: 5
});
```

And filter then, using `where`

```javascript
var c = hook.collection('posts');
c.where('author','Vicente'); // equal operator may be omitted
c.where('stars','>',10);     // support '<' and '>' operators
c.then(function(result) {
  console.log(result);
});
```

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
