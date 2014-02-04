dl-api-javascript
===

dl-api javascript client. [Documentation](http://doubleleft.github.io/dl-api-javascript/).

How-to build
---

    $ npm install -g grunt-cli
    $ npm install
    $ grunt

Publishing the docs:
---

    $ mkdir ../dl-api-javascript-docs
    $ grunt yuidoc
    $ cd ../dl-api-javascript-docs
    $ git init && git remote add origin git@github.com:doubleleft/dl-api-javascript.git && g checkout -b gh-pages && git add . && git commit -m "update public documentation" && git push origin gh-pages -f
