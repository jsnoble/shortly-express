var db = require('../config');
var Promise = require('bluebird');
var Checkit = require('checkit');


var checkit = new Checkit({
  username: 'required',
  password: ['required', 'min:8']
});

var User = db.Model.extend({
  tableName: 'users',
  initialize: function() {
    // this.on('creating', this.hashPassword);
  },
  validateUser: function(user, attrs, options) {
    checkit.run(attrs).then(function(validated) {
      this.hashPassword(attrs.password, this.saveUser);
    }).catch(Checkit.error, function(err) {

    });
  },
  hashPassword: function() {
    var initPassword = this.get('password');
    bcrypt.hash(initPassword, null, null, function(err, results) {
      if (err) throw err;

      this.set('password', results);
    });
  },
  saveUser: function(data) {
    new User({username: data.username, password: data.password}).save()
    .then(function(){})
  }
});

module.exports = User;