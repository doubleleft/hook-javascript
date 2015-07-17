hook-javascript client ![Build status](https://travis-ci.org/doubleleft/hook-javascript.svg?branch=master)
===

[![Selenium Test Status](https://saucelabs.com/browser-matrix/hook-javascript.svg)](https://saucelabs.com/u/hook-javascript)

JavaScript client for [hook](https://github.com/doubleleft/hook).


- [Documentation](http://doubleleft.github.io/hook-javascript/classes/Hook.Client.html).
- [Plugins](https://github.com/doubleleft/hook-javascript/wiki/Plugins).

How to use
---

Initialize with your app's credentials:

```javascript
var hook = new Hook.Client({
  endpoint:   "http://localhost:4665/",
  app_id: 1,   // your app id
  key: 'test'  // browser credentials of your app
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

To build and publish the docs:

```bash
make publish-docs
```

License
---

MIT
