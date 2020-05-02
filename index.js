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
var Forms     = require('./Forms.js');
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

// CSS precompiler. needs to come before /static call
var compileSass = require('express-compile-sass');
app.use('/css',compileSass({
    root: __dirname+'/scss',
    sourceMap: true, // Includes Base64 encoded source maps in output css
    sourceComments: true, // Includes source comments in output css
    watchFiles: true, // Watches sass files and updates mtime on main files for each change
    logToConsole: false // If true, will log to console.error on errors
}));
app.use('/css',express.static(__dirname + '/scss'));
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


// Configure passport and other authentication measures.
require('./auth.js')(app); 



app.get('/user', permissions.ensureAuthenticated, function (req, res, next) {
  const { _raw, _json, ...userProfile } = req.user;
  res.render('user.pug', {
    userProfile: JSON.stringify(userProfile, null, 2),
    title: 'Profile page'
  });
});


app.get('/api/test/prot',  function (req, res, next) {
  const { _raw, _json, ...userProfile } = req.user;
  res.render('user.pug', {
    userProfile: JSON.stringify(userProfile, null, 2),
    title: 'Protected page'
  });
});





app.get('/public', function(req, res) {
  res.json({
    message: 'Hello from a public endpoint! You don\'t need to be authenticated to see this.'
  });
});

// This route needs authentication
app.get('/api/private', permissions.checkAuthenticatedJson, function(req, res) {
  res.json({
    message: 'Hello from a private endpoint! You need to be authenticated to see this.',
    user: req.user
  });
});



// routes in other files
app.use(require('./routes/formRoutes.js'));
app.use(require('./routes/componentRoutes.js'));
app.use(require("./routes/testRoutes.js"));
app.use(require("./routes/workflowRoutes.js"));
app.use(require("./routes/jobRoutes.js"));

app.use('/file',require('./routes/files.js'));
app.use('/autocomplete',require("./routes/autocomplete.js"));

// Two names for api
app.use('/json',require("./routes/api.js"));
app.use('/api',require("./routes/api.js"));



app.get('/', async function(req, res, next) {
	res.render('admin.pug',
	{
		tests: await Forms.getListOfForms(),
    workflows: await Forms.getListOfForms("jobForms"),
		all_components: await Components.getComponents(),
	});
});





async function run(){
  // db.collection("components"); // testing to see if DB is live...
	app.listen(config.http_server_port, () => console.log(`Example app listening on port ${config.http_server_port}!`))	
}

database.attach_to_database()
  .then(run);

