const bodyParser = require('body-parser');
const express = require('express');
const MUUID = require('uuid-mongodb');
const MongoStore = require('connect-mongo');
const moment = require('moment');
const session = require('express-session');

const { DB_NAME, BASE_URL, NODE_ENV, SESSION_SECRET } = require('./lib/constants');
const { db } = require('./lib/db');
const logger = require('./lib/logger');
const permissions = require('./lib/permissions');
const routes = require('./routes');


/// This module contains a single function which returns an app, and is usable by either the real APA DB app or a unit test suite
/// The function is run after the database is intialised, so that session persistence is set up correctly!
async function createApp(app) {
  var app = app || express();

  app.set('trust proxy', false);  // This is for forwarding via Apache

  var startTime = Symbol('startTime');

  function my_express_logger(req, res, next) {
    logger['http']({
      method: req.method,
      url: req.url,
      ip: req.ip,
    })

    res[startTime] = Date.now();
    res.on('finish', my_logger_finish);
    res.on('error', my_logger_finish);

    next();
  }

  function my_logger_finish(err) {
    var logobj = {
      'method': this.req.method,
      'url': this.req.url,
    };

    if (err || this.err || this.statusCode >= 500) {
      var error = err || this.err || new Error(`Failed with status code: ${this.statusCode}`)
      logobj.error = error;
    } else {
      var diff = Date.now() - this[startTime];
      logobj['time_to_serve'] = diff;
    }

    logger['http'](logobj);
  }

  app.use(my_express_logger);

  // Set the Sass/Scss precompiler
  var compileSass = require('express-compile-sass');

  app.use('/css', compileSass({
    root: `${__dirname}/scss`,
    sourceMap: true,       // include Base64 encoded source maps in output css
    sourceComments: true,  // includes source comments in output css
    watchFiles: true,      // watch sass files and update mtime on main files for each change
    logToConsole: false    // if true, the app will log to 'logger.error' on errors
  }));

  app.use('/css', express.static('../scss'));

  // Set any local overrides required for testing purposes
  app.use(express.static(`${__dirname}/local/static`));
  app.use(express.static(`${__dirname}/static`));

  // For a container deployment, monitor '/persistent/static'
  app.use(express.static('/persistent/static'));

  // Parse incoming JSON objects, but set a maximum allowed size of 10MB
  app.use(bodyParser.json({ limit: '10000kb' }));
  app.use(bodyParser.urlencoded({ extended: true }));

  // Make certain (normally only server-side) functionality available in all (client-side) .pug renders
  app.use(function (req, res, next) {
    res.locals.moment = moment;
    res.locals.MUUID = MUUID;
    res.locals.route = req.originalUrl;
    res.locals.base_url = BASE_URL;
    res.locals.NODE_ENV = NODE_ENV;
    res.locals.permissions = permissions;

    next();
  });

  // Set the .pug rendering options
  app.set('view options', { pretty: true });
  app.set('view engine', 'pug')
  app.set('views', 'pug');
  app.locals.pretty = true;

  // Set the user session configuration
  const session_config = {
    store: MongoStore.create({
      client: db.client,
      dbName: DB_NAME,
      collection: 'sessionStore',
    }),
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 },
  };

  app.use(session(session_config));

  delete session_config.cookie;
  delete session_config.secret;
  delete session_config.resave;
  delete session_config.saveUninitialized;

  // Configure the authorisation passport and other authentication measures
  require('./lib/auth.js')(app, session_config);

  // Set up all routes
  routes.routes.forEach(route => app.use(route));
  routes.paths.forEach(({ path, route }) => app.use(path, route));

  // Return the fully configured app
  return app;
}


module.exports = createApp;
