// Third-party libraries
const express = require('express');
const session = require('express-session');

const app = express();
var http = require('http');
var https = require('https');

const pug = require('pug');
const chalk = require('chalk');

const uuidv4 = require('uuid/v4');
const shortuuid = require('short-uuid')();
const MUUID = require('uuid-mongodb');  // Addon for storing UUIDs as binary for faster lookup
const ObjectID = require('mongodb').ObjectID;

const morgan = require('morgan');
const bodyParser = require('body-parser');
const jsondiffpatch = require('jsondiffpatch');
const glob = require('glob');


// Global configuration
global.config = require('./configuration.js');  // must be first
var database = require('./lib/database.js'); // Exports global 'db' variable
var Components = require('./lib/Components.js');
var Forms     = require('./lib/Forms.js');
var Tests     = require('./lib/Tests.js');

var permissions = require('./lib/permissions.js');
var utils = require('./lib/utils.js');

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

// Static routes to installed modules.
// Any installed module with a dist/ directory gets that directory exposed
// on the route /dist/<module>/
  // list all modules:
glob(__dirname+'/node_modules/*/dist',
  function(err,matches) {
    if(err) throw new Error(err);
    for(var path of matches) {
      var modname = /\/node_modules\/([^\/]*)\/dist/.exec(path)[1];
      console.log('modname',modname,path);
      app.use('/dist/'+modname,express.static(path));
    }
  });
// add a couple explicitly.
app.use('/dist/fabric-history',express.static(__dirname+'/node_modules/fabric-history/src'));


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

// local overrides for testing.
app.use(express.static(__dirname + '/local/static'));

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
require('./lib/auth.js')(app); 



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
  var user_drafts = null;
  if(req.user && req.user.user_id) user_drafts=await Tests.listUserDrafts(req.user.user_id);
	res.render('admin.pug',
	{
		tests: await Forms.getListOfForms(),
    workflows: await Forms.getListOfForms("jobForms"),
		all_components: await Components.getComponents(),
    user_drafts: user_drafts,
	});
});


// for testing or other stuff.
var sanitize = require("sanitize-filename");
const path = require('path');
const fs = require('fs');
app.get('/simple/:pagename', function (req, res, next) {
  var pugfile = sanitize(req.params.pagename);
  var pathname = path.join('./pug/simple',pugfile+".pug");
  console.error("Got request for ",req.params.pagename,pathname)
  if (fs.existsSync(pathname)) 
    res.render('simple/'+pugfile+".pug", { pagename: pugfile })
  else
    next();
})




async function run(){
  // db.collection("components"); // testing to see if DB is live...
	// app.listen(config.http_server_port, () => console.log(`Example app listening on port ${config.http_server_port}!`))	
  var httpServer = http.createServer(app);
  httpServer.listen(config.http_server_port, () => console.log(`Example app listening on port ${config.http_server_port}!`))  

  // var httpsServer = https.createServer(app);
  // console.log(config.https_server_port);
  // httpsServer.listen(config.https_server_port, () => console.log(`Example app listening on https port ${config.https_server_port}!`))  


}

database.attach_to_database()
  .then(run);

