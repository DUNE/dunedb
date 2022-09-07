"use strict";

var express = require('express');
var passport = require('passport');
var util = require('util');
var url = require('url');
var querystring = require('querystring');
var Auth0Strategy = require('passport-auth0');
var jsonwebtoken = require('jsonwebtoken');
// var jwt = require('express-jwt');
// var jwks = require('jwks-rsa');

var Permissions = require("lib/permissions.js");
var chalk = require("chalk");

const { BASE_URL, AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET } = require('./constants');
const logger = require('./logger');

// routes.
var router = express.Router();

// Perform the login, after login Auth0 will redirect to callback
router.get('/login', passport.authenticate('auth0', {
  scope: 'openid email profile',
  audience: `https://apa.dunedb.org/api/` // Hardcoded URI is just an identifier for the Auth0 API
}), function (req, res) {
  res.redirect('/');
});



// Perform the final stage of authentication and redirect to previously requested URL or '/user'
router.get('/callback', function (req, res, next) {
  passport.authenticate('auth0', function (err, user, info) {
    if (err) { return next(err); }
    if (!user) { return res.send(`${JSON.stringify(err)}\n\n${JSON.stringify(user)}`); /*res.redirect('/login');*/}
    // logger.info(chalk.red("/callback authenticate callback"));
    // logger.info(chalk.red("user",JSON.stringify(user,null,2)));
    // logger.info(chalk.red("info",JSON.stringify(info,null,2)));
    req.logIn(user, function (err) {
      if (err) { return next(err); }
      const returnTo = req.session.returnTo;
      delete req.session.returnTo;
      res.redirect(returnTo || '/');
    });
  })(req, res, next);
});

// Perform session logout and redirect to homepage
router.get('/logout', (req, res) => {
  req.logout();

  // Go to '/' after logout:
  var returnTo = req.protocol + '://' + req.hostname;
  var port = req.connection.localPort;
  if (port !== undefined && port !== 80 && port !== 443) {
    returnTo += ':' + port;
  }
  returnTo = BASE_URL;

  var logoutURL = new url.URL(
    util.format('https://%s/v2/logout', AUTH0_DOMAIN)
  );
  var searchString = querystring.stringify({
    client_id: AUTH0_CLIENT_ID,
    returnTo
  });
  logoutURL.search = searchString;

  res.redirect(logoutURL);
});



/// Set user information based on a provided m2m client access token
function set_m2m_user(req, res, next) {
  // Retrieve the authorization header from the provided 'req.headers' object
  const authString = req.header('authorization');

  // Check that the access token in the header is of 'Bearer' type
  if (!(authString.startsWith('Bearer '))) return res.status(401).send('The access token in the /"authorization/" header is not of /"Bearer/" type!');

  // Extract and decode the access token from the header
  const decodedToken = jsonwebtoken.decode(authString.split(' ')[1]);

  // Set the current user information equal to the decoded token (in order to store the M2M client's permissions information)
  // We also need to explicitly set the user information fields, so that they make at least some kind of sense when displayed!
  req.user = decodedToken;
  req.user.user_id = req.user.azp;      // This is the M2M client ID ... no idea why it's under the 'azp' field in the user object!
  req.user.displayName = 'M2M Client';  // Set the display name so that it is clear that a record was not inserted or edited by a human
  req.user.emails = ['none'];           // The 'emails' list must have length > 0, but the M2M client obviously doesn't have an email address

  // Continue with the next function in whatever sequence this one was called from
  next();
}


module.exports = function(app) {
    // Configure Passport to use Auth0
    var strategy = new Auth0Strategy(
      {
        domain:       AUTH0_DOMAIN,
        clientID:     AUTH0_CLIENT_ID,
        clientSecret: AUTH0_CLIENT_SECRET,
        callbackURL:  `${BASE_URL}/callback`,
      },
      function (accessToken, refreshToken, extraParams, profile, done) {
        // accessToken is the token to call Auth0 API (not needed in the most cases)
        // extraParams.id_token has the JSON Web Token
        // profile has all the information from the user

        // decode the access token (does not verify)
        var decoded = jsonwebtoken.decode(accessToken);
        // logger.info('passport callback:');
        // logger.info(chalk.red("profile",JSON.stringify(profile,null,2)));
        // logger.info(chalk.red("token",JSON.stringify(decoded,null,2)));
        profile.permissions = decoded.permissions;
        profile.user_metadata = decoded[`${BASE_URL}/user_metadata`];
        profile.roles = decoded[`${BASE_URL}/roles`];
        logger.info(decoded,profile);
        // logger.info("auth0 strategy callback",...arguments);
        return done(null, profile);
      }
    );
    passport.use(strategy);
    app.use(passport.initialize());
    app.use(passport.session());

    // You can use this section to keep a smaller payload
    // For higher efficiency, just save the user id in serialze, then when deserializing lookup 
    // stuff in a (redis?) database. --N
    passport.serializeUser(function (user, done) {
      logger.info(chalk.red('serializeUser',user.user_id));
      done(null, user);
    });

    passport.deserializeUser(function (user, done) {
      done(null, user);
    });


    // Whenever a route with the '/api' prepend is requested, first call the 'set_m2m_user' function above
    app.use('/api', set_m2m_user);


    app.use(function (req, res, next) {
        // make the req.user object available to the pug templates! Cool!
        if(req.user) {
          res.locals.user = {...req.user};
          // // This is a hack to make sure that auto-permissions get seen by pug 
          // // Issue July, 2020
          //  Not needed anymore; auto-assigning default permissions now fixes this.
          // res.locals.user.permissions = Permissions.userPermissions(req);
        }
        next();
    });

 

    // authentication routes
    app.use('/',router);
};
