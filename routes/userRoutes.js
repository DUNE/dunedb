'use strict';

const chalk = require('chalk');
const express = require('express');
var ManagementClient = require('auth0').ManagementClient;

var permissions = require('../lib/permissions.js');
var router = express.Router();

module.exports = router;

var manager = new ManagementClient({
  domain: 'dev-pserbfiw.auth0.com', //  domain: '{YOUR_ACCOUNT}.auth0.com',
  clientId: "4huNuPkxWJfK0BKUkPCEfME4x9eR5rb6",
  clientSecret: "MWnwkyjIZSUOLQf-6Sskw9OUjm-bHqQovA-kDsOFlYV3_khF-tafmbk87c_FxZ55",//'{YOUR_NON_INTERACTIVE_CLIENT_SECRET}',
  scope: 'read:users update:users'
});


// (async function(){
//   console.log(await manager.getUsersByEmail('ntagg@otterbein.edu'))
// })();


router.get('/profile/:userId?',permissions.checkPermission("components:view"),
  async function(req,res,next) {
    var userId = req.user.user_id;
    if(userId)
      user_id = decodeURIComponent(req.params.userId);

    console.log("looking up",user_id);
    console.log(await manager.getUserRoles({id:user_id}))
    var user = await manager.getUser({id:user_id});
    if(Array.isArray(user)) return res.status(400).send("More than one user matched");
    if(!user)return res.status(400).send("No user with that ID");
   // console.log(user);
   res.render("user.pug",{user});
});

// Self-promotion
router.get("/promoteYourself",
  // permissions.checkPermission("components:view"),
  function(req,res,next) {
      res.render("promoteYourself.pug");
  });


var rate_limiter = require("express-rate-limit")({
  windowMs: 60 * 60 * 1000 * 24, // 1 day window
  max: 5, // start blocking after 5 requests
  message:
    "Too many tries - you are blocked from trying again for 1 hour."
});
router.post("/promoteYourself",
  permissions.checkPermission("components:view"),
  rate_limiter,
  async function(req,res,next) {
      console.log(req.body,global.config.self_promotion)
      if(global.config.self_promotion
        && global.config.self_promotion[req.body.user]
        && global.config.self_promotion[req.body.user].password == req.body.password) {
          try{
            var newroles = [...req.user.roles,...global.config.self_promotion[req.body.user].roles];
            var result = await manager.assignRolestoUser({id:req.user.user_id},{roles:global.config.self_promotion[req.body.user].roles});

            // get new user info
            var uroles = await manager.getUserRoles({id:req.user.user_id,per_page:100});
            // var upermissions = await manager.getUserPermissions({id:req.user.user_id,per_page:100});
            // console.log(uroles.map(i=>i.name));
            // console.log(upermissions.map(i=>i.permission_name));
            // req.user.roles = uroles.map(i=>i.name);
            // req.user.permissions = upermissions.map(i=>i.permission_name);
            res.render("promoteYourselfSuccess.pug",{roles:uroles.map(i=>i.name)});
          } catch(err) { console.log(err); console.log(err.stack)}
      } else {
          res.render("promoteYourself.pug",{message:"Invalid user/password. You are limited to 5 tries."});
      }
  });