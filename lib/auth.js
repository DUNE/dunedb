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

// My homebrew m2m authentication

// rate limiting
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


module.exports = function(app,session_config) {

    const { auth } = require("express-openid-connect");
    app.use(auth({
      issuerBaseURL: "https://" + config.auth0_domain,
      baseURL: config.my_url,
      clientID: config.auth0_client_id,
      secret: config.auth0_client_secret,
      idpLogout: true,
      authRequired: false,
      // authorizationParams: {
      //     response_type: 'code',
      //     audience: 'https://dev-pserbfiw.auth0.com/api/v2/',
      //     scope: 'openid profile email read:products',
      // },      // authorizationParams: {
      session: session_config
    }));

    app.use( async (req,res,next)=>{
      console.log("oidc.isAuthenticated: ",req.oidc.isAuthenticated());
      console.log("oidc.user: ",req.oidc.user);
      console.log("oidc.idTokenClaims: ",req.oidc.idTokenClaims);
      console.log("oidc.accessToken: ",req.oidc.accessToken);
      console.log("oidc.idToken: ",req.oidc.idToken);
      console.log("oidc.refreshToken: ",req.oidc.refreshToken);
      console.log("session: ",req.session);
      var decoded = jsonwebtoken.decode(req.oidc.idToken);
      console.log("decoded:",decoded)
      try {
        const userInfo = await req.oidc.fetchUserInfo();
        console.log("userinfo:",userInfo);
      } catch(err) {
        console.log("could not get userinfo");
        console.log(err);
      }


      if(req.oidc && req.oidc.user) {
        req.user = {...req.oidc.user};
        req.user.roles = req.oidc.user['https://sietch.xyz/roles'];

      }
      return next();
    })

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
