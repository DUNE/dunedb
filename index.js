const express = require('express');
var session = require('express-session');

const app = express()
const pug = require('pug');
const chalk = require('chalk');

const uuidv4 = require('uuid/v4');
const shortuuid = require('short-uuid')();
const MUUID = require('uuid-mongodb');  // Addon for storing UUIDs as binary for faster lookup
const ObjectID = require('mongodb').ObjectID;

var morgan = require('morgan');
var bodyParser = require('body-parser');

var jsondiffpatch = require('jsondiffpatch');

// mine
var config = require('./configuration.js');
var database = require('./database.js'); // Exports global 'db' variable
var Components = require('./Components.js');
var Forms = require('./Forms.js');
var permissions = require('./permissions.js');
var utils = require('./utils.js');

const logRequestStart = (req,res,next) => {
    console.log(`${req.method} ${req.originalUrl}`)
    next()
}
app.use(logRequestStart)

app.set('trust proxy', config.trust_proxy || false ); // for use when forwarding via apache
// 


// app.use(bodyParser.urlencoded({ limit:'1000kb', extended : true }));
app.use(bodyParser.json({ limit:'1000kb'}));
app.use(morgan('tiny'));
app.use(express.static(__dirname + '/static'));
let moment = require('moment');
app.use(function(req,res,next){ res.locals.moment = moment; next(); }); // moment.js in pug


app.set('view options', { pretty: true });
app.set('view engine', 'pug')
app.set('views','pug');
  app.locals.pretty = true;

const MongoStore = require('connect-mongo')(session);
app.use(session({
          store: new MongoStore({
                  url: 'mongodb://localhost/sessions2',
                  mongoOptions: {} // See below for details
                  }),
          secret: config.localsecret, // session secret
          resave: false,
          saveUninitialized: true,
          cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 },  // 1 week


}));


// Configure Passport.

var passport = require('passport');
var Auth0Strategy = require('passport-auth0');

// Configure Passport to use Auth0
var strategy = new Auth0Strategy(
  {
    domain:       config.auth0_domain,
    clientID:     config.auth0_client_id,
    clientSecret: config.auth0_client_secret,
    callbackURL:
      config.auth0_callback_url || 'http://localhost:12313/callback'
  },
  function (accessToken, refreshToken, extraParams, profile, done) {
    // accessToken is the token to call Auth0 API (not needed in the most cases)
    // extraParams.id_token has the JSON Web Token
    // profile has all the information from the user
    return done(null, profile);
  }
);
passport.use(strategy);
app.use(passport.initialize());
app.use(passport.session());

// You can use this section to keep a smaller payload
passport.serializeUser(function (user, done) {
  console.log('serializeUser',user);
  done(null, user);
});

passport.deserializeUser(function (user, done) {
  done(null, user);
});

// make the req.user object available to the pug templates! Cool!
app.use(function (req, res, next) {
    res.locals.user = req.user;
    next();
});

// ensure authorized: 
function ensureAuthorized (req, res, next) {
    if (req.user) { return next(); }
    req.session.returnTo = req.originalUrl;
    res.redirect('/login');
};

// authentication routes
var authRouter = require('./auth');
app.use('/',authRouter);

app.get('/user', ensureAuthorized, function (req, res, next) {
  const { _raw, _json, ...userProfile } = req.user;
  res.render('user.pug', {
    userProfile: JSON.stringify(userProfile, null, 2),
    title: 'Profile page'
  });
});





app.get('/api/public', function(req, res) {
  res.json({
    message: 'Hello from a public endpoint! You don\'t need to be authenticated to see this.'
  });
});

// This route needs authentication
app.get('/api/private', permissions.checkJwt, function(req, res) {
  res.json({
    message: 'Hello from a private endpoint! You need to be authenticated to see this.'
  });
});



// routes in other files
app.use(Components.router);
app.use(Forms.router);
app.use(require('./routes/formRoutes.js').router);
app.use(require('./routes/componentRoutes.js').router);
app.use('/file',require('./routes/files.js').router);
app.use(require("./routes/testRoutes.js").router);




app.get('/', async function(req, res, next) {
	res.render('admin.pug',
	{
		tests: await Forms.getListOfForms(),
		all_components: await Components.getComponents(),
	});
});





async function run(){
  // db.collection("components"); // testing to see if DB is live...
	app.listen(config.http_server_port, () => console.log(`Example app listening on port ${config.http_server_port}!`))	
}

database.attach_to_database()
  .then(run);

