module.exports = function (grunt) {
  var browsers = JSON.parse(require('fs').readFileSync('tests/targets.json'));
  console.log(browsers);

  grunt.initConfig({
    shell: {
      build: {
        command: 'npm run build'
      }
    },

    connect: {
      server: {
        options: {
          base: "",
          port: 9999,
          // keepalive: true
        }
      }
    },

    'saucelabs-qunit': {
      all: {
        options: {
          'max-duration': 360,
          urls: ["http://127.0.0.1:9999/tests/index.html"],
          build: process.env.TRAVIS_JOB_ID,
          concurrency: 3,
          browsers: browsers,
          testname: "hook-javascript qunit tests"
        }
      }
    }
  });

  // Loading dependencies
  for (var key in grunt.file.readJSON("package.json").devDependencies) {
      if (key !== "grunt" && key.indexOf("grunt") === 0) grunt.loadNpmTasks(key);
  }

  grunt.registerTask("test", ["shell", "connect", "saucelabs-qunit"]);
}
