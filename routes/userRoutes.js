'use strict';

const chalk = require('chalk');
const express = require('express');
var ManagementClient = require('auth0').ManagementClient;
const email = require("../lib/email.js");
var permissions = require('../lib/permissions.js');
var router = express.Router();

module.exports = router;


var manager = new ManagementClient({
  // To ensure this works:
  // Go to auth0 dsh: Applications / APIs  / Auth0ManagementAPI
  // Tab:  Machine to Machine Applications
  // Turn on the Sietch application to "Authorized"
  // Use the pulldown-arrow on the right and authorize the scopes shown below.
  // There is no issue using the same authentication clientId and clientSecret that we use
  // for the main authentication.

  domain: config.auth0_domain,
  clientId: config.auth0_client_id,
  clientSecret: config.auth0_client_secret,
  scope: 'read:users update:users read:roles'
});




// (async function(){
//   // Test that it works on startup.
//   var u = await manager.getUsersByEmail('ntagg@otterbein.edu');
//   if(u.length==0) console.log("no results");
//   u = u[0];
//   console.log(u);
//   var user_metadata = u.user_metadata || {};
//   user_metadata.start_page = "/category/flute";
//   var r = await manager.updateUserMetadata({id:u.user_id},user_metadata);
//   console.log("updated user metadata");
//   console.log(r);
// })();

router.get('/profile/:userId?',permissions.checkPermission("components:view"),
  async function(req,res,next) {
    var user_id = req.user.user_id;
    if(req.params.userId)
      user_id = decodeURIComponent(req.params.userId);

    // logger.info("looking up",user_id);
    // logger.info(await manager.getUserRoles({id:user_id}))
    var [user,roles,permissions] = await Promise.all([
        manager.getUser({id:user_id}),
        manager.getUserRoles({id:user_id}),
        manager.getUserPermissions({id:user_id}),
      ]);
    if(Array.isArray(user)) return res.status(400).send("More than one user matched");
    if(!user)return res.status(400).send("No user with that ID");
   // logger.info(user);
   res.render("user.pug",{user,roles,permissions});
});

// Self-promotion
router.get("/promoteYourself",
  permissions.checkPermission("components:view"),
  function(req,res,next) {

      req.session.promotion_attempts 
      res.render("promoteYourself.pug");
  });

// rate limiting
// var limiter = require('express-limiter-mongo')(
//   {mongoUrl: global.config.mongo_uri,
//   lookup: ['connection.remoteAddress','headers.x-forwarded-for'],
//   total: 5,
//   expire: 1000 * 60 * 60,
//   onRateLimited: (req,res,next) => { res.status(429).send(`Too many tries. You are locked out for ${(res.get("Retry-After")/60.).toFixed()} minutes; try again then.`); },
//   }
// );

// var limiter = require('express-bouncer')(500,10*60*1000,3);

// limiter.blocked = function(req,res,next,remaining) {
//   res.status(429);
//   res.send("Too many requests have been made, " +
//     "please wait " + Math.floor(remaining / 1000) + " seconds");
// };

router.post("/promoteYourself",
  permissions.ensureAuthenticated, // you can only promote if you're logged in.
  // limiter,
  async function(req,res,next) {

      // Limit retry rate.
      // logger.info(req.session.self_promotion_tries.join(','));
      req.session.self_promotion_tries =  req.session.self_promotion_tries || [];
      var now = Date.now();
      req.session.self_promotion_tries.push(now);
      var t_timeout = now -  10*60*1000; // 10 min ago
      // Keep only entries in the last 10 minutes.
      req.session.self_promotion_tries = req.session.self_promotion_tries.filter(
        (t)=>t>t_timeout
      );

      var n = req.session.self_promotion_tries.length;
      if(n > 3) {
          return res.status(403).send("Too many tries have been made. You must wait 10 minutes before retrying.");
      } 

      // logger.info(req.body,global.config.self_promotion);
      // logger.info("headers",req.headers);
      logger.info("PromoteYourself attempt: ip",req.ip, "tries", n);
      // logger.info("limiter",limiter);
      if(global.config.self_promotion
        && global.config.self_promotion[req.body.user]
        && global.config.self_promotion[req.body.user].password == req.body.password) {
          try{
            var result = await manager.assignRolestoUser({id:req.user.user_id},{roles:global.config.self_promotion[req.body.user].roles});            
            // get new user info
            var uroles = await manager.getUserRoles({id:req.user.user_id,per_page:100});
            // var upermissions = await manager.getUserPermissions({id:req.user.user_id,per_page:100});
            // logger.info(uroles.map(i=>i.name));
            // logger.info(upermissions.map(i=>i.permission_name));
            // req.user.roles = uroles.map(i=>i.name);
            // req.user.permissions = upermissions.map(i=>i.permission_name);
            var roles = uroles.map(i=>i.name);
            // Tell the authorities.
            email({
              subject: "Sietch: "+ req.user.displayName+" self-promoted",
              text: `${req.user.displayName} (${req.user.emails[0].value}) just self-promoted using username ${req.body.user}.\n\n`
                  + `Their new roles are:\n`
                  +   roles.join("\n")
            })
            // limiter.reset(req);
            res.render("promoteYourselfSuccess.pug",{roles});
          } catch(err) { logger.info(err); logger.info(err.stack)}
      } else {
          var message = `Invalid user/password. You are permitted only 3 tries before being locked out for 10 minutes.`;
          res.render("promoteYourself.pug",{message});
      }
  });

router.get("/users",permissions.checkPermissionJson('users:view'),
  // limiter,
  async function(req,res,next) {
    res.render("users_list.pug");
  }
);

router.get("/user/:user_id?",
  // limiter,
  async function(req,res,next) {
    res.render("user_edit.pug",{user_id:req.params.user_id});
  }
);

