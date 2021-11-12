// Third-party libraries
require('lib/configuration.js'); 
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
var database = require('lib/database.js'); // Exports global 'db' variable
var Components = require('lib/Components.js');
var Forms     = require('lib/Forms.js');
var Tests     = require('lib/Tests.js')('test');
var Jobs     = require('lib/Tests.js')('job');
var Cache    = require('lib/Cache.js');

var permissions = require('lib/permissions.js');
var utils = require('lib/utils.js');

// Module is a single function which returns an app 
// (Usable by either the real app or a unit test suite)

/// This function is run after the database is intialized, 
/// so that session persistence is set up correctly!

module.exports = {
  create_app
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

  // A lot of this code looted from pino-http, but simplified to only what I want.
  var startTime = Symbol('startTime');
  function my_express_logger(req,res,next)
  {
    logger['http']({
      method: req.method,
      url: req.url,
      ip: req.ip,
    })
    res[startTime] = Date.now();
    res.on('finish',my_logger_finish);
    res.on('error',my_logger_finish);
    next();
  }
  function my_logger_finish(err) {
    // 'this' is the res object
    var logobj = {'method':this.req.method,'url':this.req.url};
    if (err || this.err || this.statusCode >= 500) {
      var error = err || this.err || new Error('failed with status code ' + this.statusCode)
      logobj.error = error;
    } else {
      var diff = Date.now() - this[startTime];
      logobj['time_to_serve'] = diff;
    }
    logger['http'](logobj);
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
  for(var pathname of matches) {
    // logger.info("path",path)
    var modname = /.*\/node_modules\/([^\/]*)\/dist/.exec(pathname)[1];
    list.push(modname);
    // logger.info('modname',modname,pathname);
    app.use('/dist/'+modname,express.static(pathname));
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

  // For container deployment: monitor /persistent/static
  app.use(express.static("/persistent/static"));

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
    res.locals.permissions = permissions;
    next(); 
  }); // moment.js in pug


  app.set('view options', { pretty: true });
  app.set('view engine', 'pug')
  app.set('views','pug');
    app.locals.pretty = true;

  var session_config = null
  if(config.redis_store) {
    const RedisStore = require('connect-redis')(session);
    const redis = require("redis");
    let redisClient = redis.createClient(config.redis_store); // connection info, probably just URL, password
    session_config = {
        store: new RedisStore({ client: redisClient }),
        saveUninitialized: true,
        secret: config.localsecret,
        resave: false,      
        cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 },  // 1 week
      };

  } else {
    const MongoStore = require('connect-mongo');
    session_config = {
              store: MongoStore.create({
                      client: database.get_client(),
                      dbName: config.mongo_db,
                      collection:"sessionStore",
              }),
              secret: config.localsecret, // session secret
              resave: false,
              saveUninitialized: true,
              cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 },  // 1 week
            };
  }


  app.use(session(session_config));

  delete session_config.cookie;
  delete session_config.secret;
  delete session_config.resave;
  delete session_config.saveUninitialized;
  // Configure passport and other authentication measures.
  require('lib/auth.js')(app,session_config); 


  // Setup all routes.

  // app.get('/api/test/prot',  function (req, res, next) {
  //   const { _raw, _json, ...userProfile } = req.user;
  //   res.render('user.pug', {
  //     userProfile: JSON.stringify(userProfile, null, 2),
  //     title: 'Protected page'
  //   });
  // });


  // app.get('/public', function(req, res) {
  //   res.json({
  //     message: 'Hello from a public endpoint! You don\'t need to be authenticated to see this.'
  //   });
  // });

  // // This route needs authentication
  // app.get('/api/private', permissions.checkAuthenticatedJson, function(req, res) {
  //   res.json({
  //     message: 'Hello from a private endpoint! You need to be authenticated to see this.',
  //     user: req.user
  //   });
  // });



  // routes in other files
  app.use(require('routes/componentRoutes.js'));
  app.use(require("routes/courseRoutes.js"));
  app.use(require('routes/docsRoutes.js'));
  app.use(require('routes/draftRoutes.js'));
  app.use(require("routes/jobRoutes.js"));
  app.use(require("routes/processRoutes.js"));
  app.use(require('routes/searchRoutes.js'));
  app.use(require("routes/testRoutes.js"));
  app.use(require("routes/userRoutes.js"));
  app.use(require("routes/workflowRoutes.js"));
  
  app.use('/file',require('routes/fileRoutes.js'));
  app.use('/autocomplete',require("routes/autocomplete.js"));

  // Two names for api
  app.use('/json',require("routes/api.js"));
  app.use('/api',require("routes/api.js"));


  // icon contact sheet
  app.get("/icons",function(req,res,next){
    fs.readdir("./static/icons",function(err,files){
      var icons = files.filter(filename=>!filename.startsWith('.'));
      res.render("icons.pug",{icons})
    })
  })

  // Routes like /
  app.use(require("routes/startRoutes.js"));



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

  await Cache.regenerateAllPromise();

  return app;
}
