var LocalStrategy = require('passport-local').Strategy;
var User = require('../models/user');
var config = require('../config/database');
var bcrypt = require('bcryptjs');

module.exports = function (passport) {
  //  Create new Local strategy
  passport.use(new LocalStrategy(function (username, password, done) {
    var query = {
      username: username
    };
    // Try to find user by its username
    User.findOne(query, function (err, user) {
      // Catch if there is error
      if (err) {
        console.log(err);
      }
      // Catch if there is no username
      if (!user) {
        return done(null, false, {
          message: 'No user found'
        })
      }
      // Compate 2 passwords to see if they match
      bcrypt.compare(password, user.password, function (err, isMatch) {
        // Catch if there is error
        if (err) {
          console.log(err)
        }
        // See if they match
        if (isMatch) {
          return done(null, user);
        } else {
          return done(null, false, {
            message: 'Wrong password'
          });
        }
      });
    });
  }));
  // Some configuration from documentation
  passport.serializeUser(function (user, done) {
    done(null, user.id);
  });
  passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
      done(err, user);
    });
  });
}