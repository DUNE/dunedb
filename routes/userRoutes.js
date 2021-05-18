'use strict';

const chalk = require('chalk');
const express = require('express');
var ManagementClient = require('auth0').ManagementClient;
const email = require("../lib/email.js");
var permissions = require('../lib/permissions.js');
var router = express.Router();

module.exports = router;

var manager = new ManagementClient({
  domain: config.auth0_domain,
  clientId: config.auth0_api_clientId,
  clientSecret: config.auth0_api_clientSecret,
  scope: 'read:users update:users'
});


// (async function(){
//   logger.info(await manager.getUsersByEmail('ntagg@otterbein.edu'))
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
      var n = req.session.self_promotion_tries.length;
      if(n > 4) {
        var waituntil = req.session.self_promotion_tries[n-1] + 10*60*1000; // 10 min
        if( now > waituntil) {
          req.session.self_promotion_tries= [];
        } else {
          return res.status(403).send("Too many tries have been made. You must wait 10 minutes before retrying.");
        }
      } else {
        req.session.self_promotion_tries.push(now);
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