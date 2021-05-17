"use strict";

var express = require('express');
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
var chalk = require("chalk");

// routes.

var router = express.Router();

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

// rate limiting
// var limiter = require('express-limiter-mongo')(
//   {mongoUrl: global.config.mongo_uri,
//   lookup: ['connection.remoteAddress','headers.x-forwarded-for'],
//   total: 3,
//   expire: 1000 * 60 * 60,
//   onRateLimited: (req,res,next) => { res.status(429).send(`Too many tries. You are locked out for ${(res.get("Retry-After")/60.).toFixed()} minutes; try again then.`); },
//   }
// );

var FailLimiter = require("../lib/fail_limiter.js");
var limiter = new FailLimiter(
  {
    lookup: ['connection.remoteAddress','headers.x-forwarded-for'],
    total: 5,
    expire: 1000 * 60 * 60,
  });


// // test with curl --head "localhost:12313/testlimit"
// router.get('/testlimit', limiter, (req,res)=>{
//   res.status(200).send("ok");
// });

router.post('/machineAuthenticate', limiter.limitChecker(), async (req,res,next)=>{
  var user_id = req.body.user_id;
  var secret = req.body.secret;
  logger.info("checking secret...");
  if(!user_id) return res.status(401).send("No user_id in json body");
  if(!secret) return res.status(401).send("No secret in json body");
  var token = await m2m.AuthenticateMachineUser(user_id,secret);
  if(!token){
    await limiter.registerFail(req,res);
    return res.status(401).send("No such user_id/secret pair registered.");
  }
  // logger.info("sending token",token);
  res.status(200).send(token);
}); 

// requires JWT token.
function verify_m2m_middleware(req,res,next) {
  const authstring = req.header('authorization');
  if(! authstring.startsWith('Bearer ')) return res.status(401).send("JWT token required");
  var token = authstring.split(' ')[1];
  // logger.info("got authstring ",authstring);
  jsonwebtoken.verify(token,config.m2m_secret,{audience: "sietch-m2m"},
      (err,decoded)=>{
        if(err) return res.status(401).send("Token not verified... " + err);
        req.user = decoded;   // Verified! Copy user info into the req.user
        // logger.info('req.user',req.user);
        res.locals.user = decoded;
        next();
      }
  );

}


module.exports = function(app) {

    // Configure Passport.
    logger.info(config.my_url+"/callback");
    // Configure Passport to use Auth0
    var strategy = new Auth0Strategy(
      {
        domain:       config.auth0_domain,
        clientID:     config.auth0_client_id,
        clientSecret: config.auth0_client_secret,
        callbackURL:  config.my_url+"/callback",
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
        profile.roles = decoded["http://sietch.xyz/roles"];
        // logger.info(decoded,profile);
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

    // FIXME - this is too crude. It works only on this process, and doesn't 
    // discriminate users.
    // var rate_limiter = require("express-rate-limit")({
    //   windowMs: 60 * 60 * 1000, // 1 hour window
    //   max: 5, // start blocking after 5 requests
    //   message:
    //     "Too many tries - you are blocked from trying again for 1 hour."
    // });

    app.use('/api',verify_m2m_middleware);


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
