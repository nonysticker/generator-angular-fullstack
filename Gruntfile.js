'use strict';
var markdown = require('marked');
var semver = require('semver');
var _s = require('underscore.string');
var shell = require('shelljs');
var process = require('child_process');
var Q = require('q');
var helpers = require('yeoman-generator').test;

module.exports = function (grunt) {
  require('load-grunt-tasks')(grunt);

  grunt.initConfig({
    config: {
      demo: 'demo'
    },
    pkg: grunt.file.readJSON('package.json'),
    changelog: {
      options: {
        dest: 'CHANGELOG.md',
        versionFile: 'package.json'
      }
    },
    release: {
      options: {
        commitMessage: '<%= version %>',
        tagName: 'v<%= version %>',
        bump: false, // we have our own bump
        file: 'package.json'
      }
    },
    stage: {
      options: {
        files: ['CHANGELOG.md']
      }
    },
    buildcontrol: {
      options: {
        dir: 'demo',
        commit: true,
        push: true,
        connectCommits: false,
        message: 'Built using Angular Fullstack v<%= pkg.version %> from commit %sourceCommit%'
      },
      release: {
        options: {
          remote: 'origin',
          branch: 'master'
        }
      }
    },
    jshint: {
      options: {
        curly: false,
        node: true
      },
      all: ['Gruntfile.js', '*/index.js']
    },
    clean: {
      demo: {
        files: [{
          dot: true,
          src: [
            '<%= config.demo %>/*',
            '!<%= config.demo %>/readme.md',
            '!<%= config.demo %>/node_modules',
            '!<%= config.demo %>/.git',
            '!<%= config.demo %>/dist'
          ]
        }]
      }
    }
  });

  grunt.registerTask('bump', 'bump manifest version', function (type) {
    var options = this.options({
      file: grunt.config('pkgFile') || 'package.json'
    });

    function setup(file, type) {
      var pkg = grunt.file.readJSON(file);
      var newVersion = pkg.version = semver.inc(pkg.version, type || 'patch');
      return {
        file: file,
        pkg: pkg,
        newVersion: newVersion
      };
    }

    var config = setup(options.file, type);
    grunt.file.write(config.file, JSON.stringify(config.pkg, null, '  ') + '\n');
    grunt.log.ok('Version bumped to ' + config.newVersion);
  });

  grunt.registerTask('stage', 'git add files before running the release task', function () {
    var files = this.options().files;
    grunt.util.spawn({
      cmd: process.platform === 'win32' ? 'git.cmd' : 'git',
      args: ['add'].concat(files)
    }, grunt.task.current.async());
  });

  grunt.registerTask('generateDemo', 'generate demo', function () {
    var done = this.async();

    shell.cd(grunt.config('config').demo);

    Q()
      .then(generateDemo)
      .then(function() {
        shell.cd('../');
      })
      .catch(function(msg){
        grunt.fail.warn(msg || 'failed to generate demo')
      })
      .finally(done);

    function generateDemo() {
      var deferred = Q.defer();
      var options = {
        script: 'js',
        markup: 'html',
        stylesheet: 'sass',
        router: 'uirouter',
        mongoose: true,
        auth: true,
        oauth: ['googleAuth', 'twitterAuth'],
        socketio: true
      };

      var deps = [
        '../app',
        [
          helpers.createDummyGenerator(),
          'ng-component:app'
        ]
      ];

      var gen = helpers.createGenerator('angular-fullstack:app', deps);

      helpers.mockPrompt(gen, options);
      gen.run({}, function () {
        deferred.resolve();
      });

      return deferred.promise;
    }
  });

  grunt.registerTask('releaseDemoBuild', 'builds and releases demo', function () {
    var done = this.async();

    shell.cd(grunt.config('config').demo);

    Q()
      .then(gruntBuild)
      .then(gruntRelease)
      .then(function() {
        shell.cd('../');
      })
      .catch(function(msg){
        grunt.fail.warn(msg || 'failed to release demo')
      })
      .finally(done);

    function run(cmd) {
      var deferred = Q.defer();
      var generator = shell.exec(cmd, {async:true});
      generator.stdout.on('data', function (data) {
        grunt.verbose.writeln(data);
      });
      generator.on('exit', function (code) {
        deferred.resolve();
      });

      return deferred.promise;
    }

    function gruntBuild() {
      return run('grunt');
    }

    function gruntRelease() {
      return run('grunt buildcontrol:heroku');
    }
  });

  grunt.registerTask('demo', [
    'clean:demo',
    'generateDemo'
  ]);

  grunt.registerTask('releaseDemo', [
    'demo',
    'releaseDemoBuild',
    'buildcontrol:release'
  ]);

  //grunt.registerTask('default', ['bump', 'changelog', 'stage', 'release']);
};
