// Third-party libraries
const express = require('express');
const session = require('express-session');

const pug = require('pug');
const chalk = require('chalk');
const path = require("path");
const shortuuid = require('short-uuid')();
const MUUID = require('uuid-mongodb');  // Addon for storing UUIDs as binary for faster lookup
const ObjectID = require('mongodb').ObjectID;

const bodyParser = require('body-parser');
const jsondiffpatch = require('jsondiffpatch');
const glob = require('glob');


// Global configuration
// global.config = require('./configuration.js');  // must be first
var database = require('./database.js'); // Exports global 'db' variable
var Components = require('./Components.js');
var Forms     = require('./Forms.js');
var Tests     = require('./Tests.js')('test');
var Jobs     = require('./Tests.js')('job');
var Cache    = require('./Cache.js');

var permissions = require('./permissions.js');
var utils = require('./utils.js');

// Module is a single function which returns an app 
// (Usable by either the real app or a unit test suite)

/// This function is run after the database is intialized, 
/// so that session persistence is set up correctly!

module.exports = {
  create_app,
  setup_routes,
};
async function create_app(app) 
{
  var app = app || express();

  ///
  /// Logging - comes before static routes so 'skip' can work correctly.
  ///
  // function skip(req,res){
  //     // logger.info("skip",req.path);
  //     if(req.originalUrl.startsWith('/dist')) return true;
  //     if(req.originalUrl.startsWith('/css')) return true;
  //     if(req.originalUrl.startsWith('/js')) return true;
  //     if(req.originalUrl.startsWith('/components')) return true;
  //     if(req.originalUrl.startsWith('/images')) return true;
  //     if(req.originalUrl.startsWith('/ext')) return true;
  //     return false;
  // }
  // const morgan = require('morgan');
  // const logRequestStart = (req,res,next) => {
  //     if(!skip(req,res))
  //       logger.info(`${req.method} ${req.originalUrl}`)
  //     next();
  // }
  // app.use(logRequestStart);
  // app.use(morgan('tiny',{skip:skip}));

  app.set('trust proxy', config.trust_proxy || false ); // for use when forwarding via apache


  var startTime = Symbol('startTime');
  function my_express_logger(req,res,next)
  {
    logger.info({
      method: req.method,
      url: req.url,
      remoteAddress: req.ip,
    })
    logger.info(req.ip);
    res[startTime] = Date.now();
    res.on('finish',my_logger_finish);
    res.on('error',my_logger_finish);
    next();
  }
  function my_logger_finish(err) {
    var diff = Date.now() - this[startTime];
    logger.info({'ms':diff,'url':this.url})
  }
  app.use(my_express_logger);
  // var my_express_logger = require("pino-http")({
  //   logger: global.logger, //| require("pino")(),
  //   useLevel: 'info',
  // });
  // app.use(my_express_logger);





  // Static routes to installed modules.
  // Any installed module with a dist/ directory gets that directory exposed
  // on the route /dist/<module>/
    // list all modules:
  var matches = glob.sync(`${global.BaseDir}/node_modules/*/dist`);
  var list = [];
  for(var path of matches) {
    // logger.info("path",path)
    var modname = /.*\/node_modules\/([^\/]*)\/dist/.exec(path)[1];
    list.push(modname);
    // logger.info('modname',modname,path);
    app.use('/dist/'+modname,express.static(path));
  }
  logger.info("Added /dist/ paths on modules",list.join(' '))
  
  // add some static routes to libraries explicity..
  app.use('/dist/fabric-history',express.static(`${global.BaseDir}/node_modules/fabric-history/src`));
  app.use('/dist/moment',express.static(`${global.BaseDir}/node_modules/moment/min`));
  app.use('/dist/jsonurl',express.static(`${global.BaseDir}/node_modules/@jsonurl/jsonurl/dist`));


  // CSS precompiler. needs to come before /static call
  var compileSass = require('express-compile-sass');
  app.use('/css',compileSass({
      root: `${global.BaseDir}/scss`,
      sourceMap: true, // Includes Base64 encoded source maps in output css
      sourceComments: true, // Includes source comments in output css
      watchFiles: true, // Watches sass files and updates mtime on main files for each change
      logToConsole: false // If true, will log to logger.error on errors
  }));
  app.use('/css',express.static('../scss'));

  // local overrides for testing.
  app.use(express.static(`${global.BaseDir}/local/static`));
  app.use(express.static(`${global.BaseDir}/static`));


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
    res.locals.permissions = require("./permissions.js");
    next(); 
  }); // moment.js in pug


  app.set('view options', { pretty: true });
  app.set('view engine', 'pug')
  app.set('views','pug');
    app.locals.pretty = true;

  const MongoStore = require('connect-mongo')(session);
  app.use(session({
            store: new MongoStore({
                    client: database.get_client(),
                    dbName: config.mongo_db,
                    collection:"sessionStore",
            }),
            secret: config.localsecret, // session secret
            resave: false,
            saveUninitialized: true,
            cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 },  // 1 week


  }));

  // Configure passport and other authentication measures.
  require('./auth.js')(app); 

  return app;
}

async function setup_routes(app)
{

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
  app.use(require('../routes/formRoutes.js'));
  app.use(require('../routes/componentRoutes.js'));
  app.use(require("../routes/testRoutes.js"));
  app.use(require("../routes/workflowRoutes.js"));
  app.use(require("../routes/jobRoutes.js"));
  app.use(require("../routes/processRoutes.js"));
  app.use(require('../routes/searchRoutes.js'));

  app.use(require("../routes/userRoutes.js"));

  app.use('/file',require('../routes/files.js'));
  app.use('/autocomplete',require("../routes/autocomplete.js"));

  // Two names for api
  app.use('/json',require("../routes/api.js"));
  app.use('/api',require("../routes/api.js"));

  var showdown = require('showdown');
  showdown.setFlavor('github');

  var md_converter = new showdown.Converter();
  function serve_markdown_file(req,res,next)
  {
    logger.info('markdown');
    fs.readFile('./docs/'+req.params.file,"utf8",(err,data)=>{
      if(err) return res.status(404).send("No such md file");
      logger.info(md_converter.makeHtml(data));
      return res.render("md.pug",{md:md_converter.makeHtml(data)});
    });
  }

  app.get("/docs/:file(*.md)",serve_markdown_file);
  app.get("/docs",function(req,res,next){
    req.params.file = 'index.md'; 
    return serve_markdown_file(req,res,next);
  });
  app.use("/docs",express.static('../docs'));


  // icon contact sheet
  app.get("/icons",function(req,res,next){
    fs.readdir("./static/icons",function(err,files){
      var icons = files.filter(filename=>!filename.startsWith('.'));
      res.render("icons.pug",{icons})
    })
  })

  // Routes like /
  app.use(require("../routes/startRoutes.js"));



  //  pug/simple is a set of static pages, for prototyping or quick things
  var sanitize = require("sanitize-filename");
  const fs = require('fs');
  app.get('/simple/:pagename', function (req, res, next) {
    var pugfile = sanitize(req.params.pagename);
    var pathname = path.join('./pug/simple',pugfile+".pug");
    logger.error("Got request for ",req.params.pagename,pathname)
    if (fs.existsSync(pathname)) 
      res.render('simple/'+pugfile+".pug", { pagename: pugfile })
    else
      next();
  })

  app.get("/bad",function(req,res,next) {
    return res.status(400).send("This is a bad route");
  });

  await Cache.regenerateAllPromise();

  return app;
}
