var express = require('express');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var expressValidator = require('express-validator');
var flash = require('connect-flash');
var session = require('express-session');
var passport = require('passport');
var bcrypt = require('bcryptjs');
var path = require("path");
var firebase = require('firebase');
var config = require("./config/database");

var configa = {
  apiKey: "AIzaSyC2txgtiDyvdYTtKApIgRtU6FgtrCzNy8I",
  authDomain: "databse-8a9e7.firebaseapp.com",
  databaseURL: "https://databse-8a9e7.firebaseio.com",
  projectId: "databse-8a9e7",
  storageBucket: "databse-8a9e7.appspot.com",
  messagingSenderId: "33284685091"
};
firebase.initializeApp(configa);

// Initialize express aplication
var app = express();

// Create connection with MongoDB
mongoose.connect(config.database);
var db = mongoose.connection;

// Open connection with MongoDB database
db.once('open', function () {
  console.log("Connected to MongoDB database!");
});

// Check if there is any error with connection 
db.on('error', function (err) {
  console.log(err);
});

// Bring in Users model
var User = require('./models/user');

// Set default port for localhost
app.set('port', (process.env.PORT || 5000));

// Set path for public folder
app.use(express.static(__dirname + '/public'));

// Views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

// Initialize body-paresr middleware
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(bodyParser.json());

// Express session middleware
app.use(session({
  secret: '12345',
  resave: true,
  saveUninitialized: true,
  //cookie:{secure:true}
}));

// Express messages middleware
app.use(require('connect-flash')());
app.use(function (req, res, next) {
  res.locals.messages = require('express-messages')(req, res);
  next();
});

// Express validator middleware
app.use(expressValidator({
  errorFormatter: function (param, msg, value) {
    var namespace = param.split('.'),
      root = namespace.shift(),
      formParam = root;

    while (namespace.length) {
      formParam += '[' + namespace.shift() + ']';
    }
    return {
      param: formParam,
      msg: msg,
      value: value
    };
  }
}));

// Add passport local strategy
require('./config/passport')(passport);
app.use(passport.initialize());
app.use(passport.session());

// Boolean for user login
var isLogedIn = false;

// Set global variable for every route
app.get('*', function (req, res, next) {
  res.locals.isLogedIn = req.user || null;
  next();
});

// Set home route
app.get('/', function (req, res) {
  // Get all users from database
  User.find({}, function (err, users) {
    // Check for errors
    if (err) {
      console.log(err);
    } else {
      res.render('pages/index', {
        users: users
      });
    }
  });
});
// Create new user in database
app.post('/users/add', function (req, res) {
  // Create new User object
  var newUser = new User();

  // Check if any of fields are empty
  req.checkBody('firstname', 'Firstname is required!').notEmpty();
  req.checkBody('lastname', 'Lastname is required!').notEmpty();
  req.checkBody('username', 'Username is required!').notEmpty();
  req.checkBody('password', 'password is required!').notEmpty();

  // Give that data to the new User object
  newUser.firstname = req.body.firstname;
  newUser.lastname = req.body.lastname;
  newUser.username = req.body.username;
  newUser.password = req.body.password;

  // Check for erorrs
  var errors = req.validationErrors();
  if (errors) {
    req.flash('red white-text', 'Fill all fields!');
    res.redirect('/');
  } else {
    // Check length of User username field
    if (newUser.username.length < 5) {
      req.flash('red white-text', 'Username must have more than 5 letters!');
      res.redirect('/');
      return;
    }
    // Check length of User password field
    if (newUser.password.length < 6) {
      req.flash('red white-text', 'Password must have more than 6 letters!');
      res.redirect('/');
      return;
    }
    // Encrypt User password
    bcrypt.genSalt(10, function (err, salt) {
      bcrypt.hash(newUser.password, salt, function (err, hash) {
        if (err) {
          console.log(err);
        }
        // Give the User new encrypted password
        newUser.password = hash;
        // Add new User to database
        newUser.save(function (err) {
          // Check for errors
          if (err) {
            console.log(err)
          } else {
            console.log("New user added to database !")
            req.flash('active', 'You are succesfully registered, you can login now!');
            res.redirect('/');
          }
        });
      });
    });
  }
});

// Route for dashboard page
app.get('/dashboard', function (req, res) {
  var db = firebase.database();
  var ref = db.ref('api');
  var api = [];
  // Execute one of two given functions if there is/isn't data
  ref.on('value', gotData, errData);
  // If there is data response with them
  function gotData(data) {
    //console.log(data.val());
    var scores = data.val();
    var keys = Object.keys(scores);
    //console.log(keys);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      //console.log(scores[k])
      api.push(scores[k])
      //console.log(name,score);
    }
    // res.json(api);
    res.render('pages/dashboard',{api:api,keys:keys});
  }
  // If there is no data console log error
  function errData(err) {
    console.log(err);
  }
  
});

// Route for user login 
app.post('/users/login', function (req, res, next) {
  isLogedIn = true;
  passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/',
    failureFlash: true
  })(req, res, next);
});

// Route for logout
app.get('/logout', function (req, res) {
  isLogedIn = false;
  req.logout();
  req.flash('active', 'You are loged out');
  res.redirect('/');
});

// API's from firebase route
app.get('/api/:id', function (req, res) {
  var db = firebase.database();
  var ref = db.ref('api');
  // Create arry that will contain API's
  var api = [];
  // Get key from url
  var key = req.params.id;
  // Execute one of two given functions if there is/isn't data
  ref.on('value', gotData, errData);
  // If there is data response with them
  function gotData(data) {
    //console.log(data.val());
    var scores = data.val();
    var keys = Object.keys(scores);
    //console.log(keys);
    for (var i = 0; i < keys.length; i++) {
      if(key == keys[i]){
        var k = keys[i];
        var api = scores[k];
        res.json(api);
        return;
      }
      //console.log(scores[k])
      //api.push(scores[k])
      //console.log(name,score);
    }
    
  }
  // If there is no data console log error
  function errData(err) {
    console.log(err);
    res.redirect('/dashboard');
  }
});

// Create API's route
app.post('/create/api', function (req, res) {
  // Check if user is not logged in
  if (!isLogedIn) {
    res.redirect('/dashboard');
    return;
  } else {
    var dba = firebase.database();
    var ref = dba.ref('api');
    var data = req.body.jsonbody;
    var title = req.body.title;
    // Try to parse data from body
    try{
      var data = JSON.parse(data);
    }
    // Catch if there is error
    catch(err){
      console.log(err);
      req.flash('red','Body is not valid');
      res.redirect('/dashboard');
      return;
    }
    // Check if title is empty
    if(title == ""){
      req.flash('red','Title must not be empty');
      res.redirect('/dashboard');
      return;
    }
    var newdata = {
      title:title,
      body:data
    }
    console.log(data)
    // Push data to database
    ref.push(newdata);
    res.redirect('/dashboard');
  }
});

app.listen(app.get('port'), function () {
  console.log('Node app is running on port', app.get('port'));
});