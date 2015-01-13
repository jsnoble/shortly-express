var express = require('express');
var router = express.Router();
var util = require('../../lib/utility');
var bcrypt = require('bcrypt-nodejs');

var db = require('../config');
var Users = require('../collections/users');
var User = require('../models/user');
var Links = require('../collections/links');
var Link = require('../models/link');
var Click = require('../models/click');

function checkUser(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    req.session.error = 'Access denied!';
    res.redirect('/login');
  }
}

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
// Write your authentication routes here
/************************************************************/
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

 router.post('/login', function(req, res){

   var userObj = {
     username: req.body.username,
     password: req.body.password
   };

   new User({username: req.body.username}).fetch()
     .then(function(user) {
       var hashedPassword = user.get('password');
       bcrypt.compare(userObj.password, hashedPassword, function(err, isUser){
         if (err) throw err;

        if (isUser) {
           req.session.regenerate(function() {
             var username = user.get('username');
             req.session.user = username;
             res.redirect('/');
           });
         } else {
           res.redirect('/signup');
         }
       })
     });
   //validate inputs
     //if exists in DB return session (token or whatever)
        //redirect to index
     //else redirect to signup TODO: make them visually distinctive, they look to much the same, need button

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

module.exports = router;