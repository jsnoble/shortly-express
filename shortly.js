var express = require('express');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var sessions = require('express-session');

var routes = require('./app/routes/index');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));


app.use(sessions({
  secret:'apples',
  resave: false,
  saveUninitialized: true
}));

app.use('/', routes);



console.log('Shortly is listening on 4568');
app.listen(4568);
