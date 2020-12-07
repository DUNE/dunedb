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

const bodyParser = require('body-parser');
const jsondiffpatch = require('jsondiffpatch');
const glob = require('glob');


// Global configuration
global.config = require('./configuration.js');  // must be first
var database = require('./lib/database.js'); // Exports global 'db' variable
var Components = require('./lib/Components.js');
var Forms     = require('./lib/Forms.js');
var Tests     = require('./lib/Tests.js')('test');
var Jobs     = require('./lib/Tests.js')('job');
var Cache    = require('./lib/Cache.js');

var permissions = require('./lib/permissions.js');
var utils = require('./lib/utils.js');

///
/// Logging - comes before static routes so 'skip' can work correctly.
///
function skip(req,res){
    // console.log("skip",req.path,req);
    if(req.originalUrl.startsWith('/dist')) return true;
    if(req.originalUrl.startsWith('/css')) return true;
    if(req.originalUrl.startsWith('/js')) return true;
    if(req.originalUrl.startsWith('/components')) return true;
    if(req.originalUrl.startsWith('/images')) return true;
    if(req.originalUrl.startsWith('/ext')) return true;
    return false;
}
const morgan = require('morgan');
const logRequestStart = (req,res,next) => {
    if(!skip(req,res))
      console.log(`${req.method} ${req.originalUrl}`)
    next();
}
app.use(logRequestStart);
app.use(morgan('tiny',{skip:skip}));


app.set('trust proxy', config.trust_proxy || false ); // for use when forwarding via apache


// Static routes to installed modules.
// Any installed module with a dist/ directory gets that directory exposed
// on the route /dist/<module>/
  // list all modules:
glob(__dirname+'/node_modules/*/dist',
  function(err,matches) {
    if(err) throw new Error(err);
    var list = [];
    for(var path of matches) {
      var modname = /\/node_modules\/([^\/]*)\/dist/.exec(path)[1];
      list.push(modname);
      // console.log('modname',modname,path);
      app.use('/dist/'+modname,express.static(path));
    }
    console.log("Added /dist/ paths on modules",list.join(' '))
  });

// add some static routes to libraries explicity..
app.use('/dist/fabric-history',express.static(__dirname+'/node_modules/fabric-history/src'));
app.use('/dist/moment',express.static(__dirname+'/node_modules/moment/min'));
app.use('/dist/jsonurl',express.static(__dirname+'/node_modules/@jsonurl/jsonurl/dist'));


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


// Parse incoming JSON. Disallow things more than 10 MB
app.use(bodyParser.json({ limit:'10000kb'}));
app.use(bodyParser.urlencoded({ extended: true })); 


let moment = require('moment');

// Add some functionality to ALL pug renders. 
app.use(function(req,res,next){ 
  res.locals.moment = moment; 
  res.locals.MUUID = MUUID;
  res.locals.route = req.originalUrl;
  res.locals.base_url = global.config.my_url;
  res.locals.deployment = global.config.deployment;
  res.locals.permissions = require("./lib/permissions.js");
  next(); 
}); // moment.js in pug


app.set('view options', { pretty: true });
app.set('view engine', 'pug')
app.set('views','pug');
  app.locals.pretty = true;

const MongoStore = require('connect-mongo')(session);
app.use(session({
          store: new MongoStore({
                  url: config.mongo_uri,
                  dbName: config.mongo_db,
                  collection:"sessionStore",
                  // url: 'mongodb://localhost/sessions2',
                  // mongoOptions: {} // See below for details
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
  res.render('current_user.pug', {
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
app.use(require("./routes/processRoutes.js"));
app.use(require('./routes/searchRoutes.js'));

app.use(require("./routes/userRoutes.js"));

app.use('/file',require('./routes/files.js'));
app.use('/autocomplete',require("./routes/autocomplete.js"));

// Two names for api
app.use('/json',require("./routes/api.js"));
app.use('/api',require("./routes/api.js"));




var showdown = require('showdown');
showdown.setFlavor('github');

var md_converter = new showdown.Converter();
function serve_markdown_file(req,res,next)
{
  console.log('markdown');
  fs.readFile('./docs/'+req.params.file,"utf8",(err,data)=>{
    if(err) return res.status(404).send("No such md file");
    console.log(md_converter.makeHtml(data));
    return res.render("md.pug",{md:md_converter.makeHtml(data)});
  });
}

app.get("/docs/:file(*.md)",serve_markdown_file);
app.get("/docs",function(req,res,next){
  req.params.file = 'index.md'; 
  return serve_markdown_file(req,res,next);
});
app.use("/docs",express.static(__dirname + '/docs'));


// icon contact sheet
app.get("/icons",function(req,res,next){
  fs.readdir("./static/icons",function(err,files){
    var icons = files.filter(filename=>!filename.startsWith('.'));
    res.render("icons.pug",{icons})
  })
})


app.get('/', async function(req, res, next) {
 //  var user_drafts = null;
 //  var job_drafts = null;
 //  var test_drafts = null;
 //  if(req.user && req.user.user_id) test_drafts=await Tests.listUserDrafts(req.user.user_id);
 //  if(req.user && req.user.user_id) job_drafts=await Jobs.listUserDrafts(req.user.user_id);
	// res.render('admin.pug',
	// {
	// 	tests: await Forms.getListOfForms(),
 //    workflows: await Forms.getListOfForms("jobForms"),
	// 	all_components: await Components.getComponents(),
 //    test_drafts,
 //    job_drafts
	// });

  res.render('home.pug')
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
  Cache.regenerateAll();
  var httpServer = http.createServer(app);
  httpServer.listen(config.http_server_port, () => console.log(`Example app listening on port ${config.http_server_port}!`))  

  // var httpsServer = https.createServer(app);
  // console.log(config.https_server_port);
  // httpsServer.listen(config.https_server_port, () => console.log(`Example app listening on https port ${config.https_server_port}!`))  


}

database.attach_to_database()
  .then(run);

