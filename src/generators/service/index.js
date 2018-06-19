var yeoman = require('yeoman-generator');

var Generator = yeoman.Base.extend({
  compose: function() {
    this.composeWith('ng-component:service', {arguments: this.arguments}, { local: require.resolve('generator-ng-component/generators/service') });
  }
});

module.exports = Generator;
