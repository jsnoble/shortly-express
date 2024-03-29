var express = require('express');
var router = express.Router();
var util = require('../../lib/utility');
var bcrypt = require('bcrypt-nodejs');
var passport = require('passport');

require('../auth/strategies')(passport);

var db = require('../config');
var Users = require('../collections/users');
var User = require('../models/user');
var Links = require('../collections/links');
var Link = require('../models/link');
var Click = require('../models/click');


/************************************************************/
// Write your authentication routes here
/************************************************************/

router.get('/auth/github', passport.authenticate('github', { scope: ['profile', 'email', 'name'] }));

router.get('/auth/github/callback', passport.authenticate('github', { failureRedirect: '/login', successRedirect: '/' }));

//todo
router.get('/signup', function(req, res){
  res.render('signup')
});

router.post('/signup', function(req, res){

  var userObj = {
    username: req.body.username,
    password: req.body.password
  };


  util.hashPassword(userObj.password, function(hash){
    new User({username: userObj.username, password: hash})
      .save()
      .then(function(newUser){
        Users.add(newUser);
        req.session.regenerate(function() {
          req.session.user = userObj.username;
          res.redirect('/');
        });
      });
  });

});

router.get('/login', function(req, res){
  res.render('login');
});

router.get('/logout', function(req,res) {
  //req.session.destroy(function(err) {
  //  if (err) throw err;
  //  res.redirect('/login');
  //});
  req.logout();
  res.redirect('/login');
});


router.get('/', checkUser,
  function(req, res) {
    res.render('index');
  });

router.get('/create', checkUser,
  function(req, res) {
    res.render('index');
  });

router.get('/links', checkUser,
  function(req, res) {
    Links.reset().fetch().then(function(links) {
      res.send(200, links.models);
    });
  });

router.post('/links', checkUser,
  function(req, res) {
    var uri = req.body.url;

    if (!util.isValidUrl(uri)) {
      console.log('Not a valid url: ', uri);
      return res.send(404);
    }

    new Link({ url: uri }).fetch().then(function(found) {
      if (found) {
        res.send(200, found.attributes);
      } else {
        util.getUrlTitle(uri, function(err, title) {
          if (err) {
            console.log('Error reading URL heading: ', err);
            return res.send(404);
          }

          var link = new Link({
            url: uri,
            title: title,
            base_url: req.headers.origin
          });

          link.save().then(function(newLink) {
            Links.add(newLink);
            res.send(200, newLink);
          });
        });
      }
    });
  });

/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

router.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        db.knex('urls')
          .where('code', '=', link.get('code'))
          .update({
            visits: link.get('visits') + 1
          }).then(function() {
            return res.redirect(link.get('url'));
          });
      });
    }
  });
});

function checkUser(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  } else {
    //req.session.error = 'Access denied!';
    res.redirect('/login');
  }
}


module.exports = router;