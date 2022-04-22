// Third-party libraries
const express = require('express');
const session = require('express-session');

const path = require("path");
const MUUID = require('uuid-mongodb');  // Addon for storing UUIDs as binary for faster lookup

const bodyParser = require('body-parser');
const glob = require('glob');
const MongoStore = require('connect-mongo');

// Global configuration
const { db } = require('./lib/db');
const logger = require('./lib/logger');
const { DB_NAME, BASE_URL, NODE_ENV, SESSION_SECRET } = require('./lib/constants');
const routes = require('./routes');
var Cache    = require('lib/Cache.js');

var permissions = require('lib/permissions.js');

// Module is a single function which returns an app 
// (Usable by either the real app or a unit test suite)

/// This function is run after the database is intialized, 
/// so that session persistence is set up correctly!

async function createApp(app) {
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

  app.set('trust proxy', false); // for use when forwarding via apache

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

  // Static routes to installed modules.
  // Any installed module with a dist/ directory gets that directory exposed
  // on the route /dist/<module>/
  // list all modules:
  var matches = glob.sync(`${__dirname}/node_modules/*/dist`);
  var list = [];
  for(var pathname of matches) {
    var modname = pathname.match(/node_modules\/(.+)\//)[1];
    list.push(modname);
    app.use(`/dist/${modname}`, express.static(pathname));
  }
  logger.info(`Added /dist/ paths on modules: ${list.join(', ')}`)
  
  // add some static routes to libraries explicity..
  // TODO(micchickenburger):  WTF
  app.use('/dist/fabric-history',express.static(`${__dirname}/node_modules/fabric-history/src`));
  app.use('/dist/moment',express.static(`${__dirname}/node_modules/moment/min`));
  app.use('/dist/jsonurl',express.static(`${__dirname}/node_modules/@jsonurl/jsonurl/dist`));


  // CSS precompiler. needs to come before /static call
  var compileSass = require('express-compile-sass');
  app.use('/css',compileSass({
      root: `${__dirname}/scss`,
      sourceMap: true, // Includes Base64 encoded source maps in output css
      sourceComments: true, // Includes source comments in output css
      watchFiles: true, // Watches sass files and updates mtime on main files for each change
      logToConsole: false // If true, will log to logger.error on errors
  }));
  app.use('/css',express.static('../scss'));

  // local overrides for testing.
  app.use(express.static(`${__dirname}/local/static`));
  app.use(express.static(`${__dirname}/static`));

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
    res.locals.base_url = BASE_URL;
    res.locals.NODE_ENV = NODE_ENV;
    res.locals.permissions = permissions;
    next(); 
  }); // moment.js in pug


  app.set('view options', { pretty: true });
  app.set('view engine', 'pug')
  app.set('views','pug');
  app.locals.pretty = true;

  const session_config = {
    store: MongoStore.create({
      client: db.client,
      dbName: DB_NAME,
      collection: "sessionStore",
    }),
    secret: SESSION_SECRET, // session secret
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 },  // 1 week
  };
  app.use(session(session_config));

  delete session_config.cookie;
  delete session_config.secret;
  delete session_config.resave;
  delete session_config.saveUninitialized;
  // Configure passport and other authentication measures.
  require('lib/auth.js')(app,session_config); 


  // Setup all routes
  routes.routes.forEach(route => app.use(route));
  routes.paths.forEach(({ path, route }) => app.use(path, route));

  await Cache.regenerateAllPromise();

  return app;
}

module.exports = createApp;
