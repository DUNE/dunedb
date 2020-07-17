"use strict";

var express = require('express');
var router = express.Router();
var passport = require('passport');
var util = require('util');
var url = require('url');
var querystring = require('querystring');
var Auth0Strategy = require('passport-auth0');
var m2m = require('../lib/m2m.js');
var jsonwebtoken = require('jsonwebtoken');
// var jwt = require('express-jwt');
// var jwks = require('jwks-rsa');

var Permissions = require("../lib/permissions.js");

// Perform the login, after login Auth0 will redirect to callback
router.get('/login', passport.authenticate('auth0', {
  scope: 'openid email profile',
  audience: 'https://sietch.xyz/api'
}), function (req, res) {
  res.redirect('/');
});

// Perform the final stage of authentication and redirect to previously requested URL or '/user'
router.get('/callback', function (req, res, next) {
  passport.authenticate('auth0', function (err, user, info) {
    if (err) { return next(err); }
    if (!user) { return res.send("no user???"); /*res.redirect('/login');*/}
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
  returnTo = config.my_url;

  var logoutURL = new url.URL(
    util.format('https://%s/v2/logout', config.auth0_domain)
  );
  var searchString = querystring.stringify({
    client_id: config.auth0_client_id,
    returnTo: returnTo
  });
  logoutURL.search = searchString;

  res.redirect(logoutURL);
});


// My homebrew m2m authentication
router.post('/machineAuthenticate', async (req,res)=>{
  var user_id = req.body.user_id;
  var secret = req.body.secret;
  if(!user_id) return res.status(401).send("No user_id in json body");
  if(!secret) return res.status(401).send("No secret in json body");
  var token = await m2m.AuthenticateMachineUser(user_id,secret);
  if(!token) return res.status(401).send("No such user_id/secret pair registered.");
  console.log("sending token",token);
  res.status(200).send(token);
}); 

// requires JWT token.
function verify_m2m_middleware(req,res,next) {
  const authstring = req.header('authorization');
  if(! authstring.startsWith('Bearer ')) return res.status(401).send("JWT token required");
  var token = authstring.split(' ')[1];
  jsonwebtoken.verify(token,config.m2m_secret,{audience: "sietch-m2m"},
      (err,decoded)=>{
        if(err) return res.status(401).send("Token not verified" + err);
        req.user = decoded;   // Verified! Copy user info into the req.user
        res.locals.user = decoded;
        next();
      }
  );

}


module.exports = function(app) {

    // Configure Passport.

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

        // decode the access token (does not verify)
        var decoded = jsonwebtoken.decode(accessToken);
        profile.permissions = decoded.permissions;
        console.log(decoded,profile);
        // console.log("auth0 strategy callback",...arguments);
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


    // // Machine-to-machine authentication via auth0
    // var jwtCheck = jwt({
    //   secret: jwks.expressJwtSecret({
    //       cache: true,
    //       rateLimit: true,
    //       jwksRequestsPerMinute: 5,
    //       jwksUri: 'https://' + config.auth0_domain + '/.well-known/jwks.json'
    // }),
    // audience: 'https://sietch.xyz/api',
    // issuer: 'https://' + config.auth0_domain + '/',
    // algorithms: ['RS256'],
    // credentialsRequired: false,
    // });

    // app.use('/api',jwtCheck);

    app.use('/api',verify_m2m_middleware);


    app.use(function (req, res, next) {
        // make the req.user object available to the pug templates! Cool!
        res.locals.user = {...req.user};
        // This is a hack to make sure that auto-permissions get seen by pug 
        // Issue July, 2020
        res.locals.user.permissions = Permissions.userPermissions(req);
        next();
    });

 

    // authentication routes
    app.use('/',router);
};