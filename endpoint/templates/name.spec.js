'use strict';

var app = require('../../app');
var request = require('supertest');

describe('GET <%= route %>', function() {

  it('should respond with JSON array', function(done) {
    request(app)
      .get('<%= route %>')
      .expect(200)
      .expect('Content-Type', /json/)
      .end(function(err, res) {
        if (err) return done(err);
        res.body.should.be.instanceOf(Array);
        done();
      });
  });
});
