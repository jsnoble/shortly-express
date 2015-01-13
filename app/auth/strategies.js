var GitHubStrategy = require('passport-github').Strategy,
    config = require('./config'),

    User = require('../models/user'),
    Users = require('../collections/users');

module.exports = function(passport) {

  passport.serializeUser(function(user, done) {
    done(null, user.id);
  });

  passport.deserializeUser(function(id, done) {
    new User({id: id}).fetch()
      .then(function(user) {
        done(null, user);
      })
      .catch(function(err) {
        throw err;
      });
  });

  passport.use(new GitHubStrategy(config.github,
    function(accessToken, refreshToken, profile, done) {

      // make code async
      process.nextTick(function() {
        // try to find user based on github ID
        new User({ 'github_id': profile.id }).fetch({ require: true })
          .then(function(user) {
            done(null, user);
          })
          .catch(function(err) { // If the user doesn't exist
            new User({
              'github_id' : profile.id,
              'github_token': accessToken,
              'github_name': profile.displayName,
              'github_email': profile.emails[0].value
            }).save()
              .then(function(newUser) {
                Users.add(newUser);
                done(null, newUser);
              })
          })

      });
    }
  ));
};
