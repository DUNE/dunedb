'use strict';

// General pug requirements
const chalk = require('chalk');
const express = require('express');
var ManagementClient = require('auth0').ManagementClient;

// Local Javascript libraries
const email = require("lib/email.js");
var permissions = require('lib/permissions.js');

var router = express.Router();
module.exports = router;


var manager = new ManagementClient(
{
  // To ensure this works:
  // Go to auth0 dashboard -> Applications -> APIs -> Auth0ManagementAPI
  // Go to the "Machine to Machine Applications" tab
  // Turn on the Sietch application to "Authorized"
  // Use the pulldown arrow on the right and authorize the scopes shown below
  // There is no issue using the same authentication clientId and clientSecret that we use for the main authentication.

  domain: config.auth0_domain,
  clientId: config.auth0_client_id,
  clientSecret: config.auth0_client_secret,
  scope: 'read:users update:users read:roles'
});


/*
(async function()
{
  // Test that it works on startup
  var u = await manager.getUsersByEmail('majumdar@liverpool.ac.uk');
  
  if(u.length == 0)
  {
    console.log("No results");
  }
  
  u = u[0];
  console.log(u);
  
  var user_metadata = u.user_metadata || {};
  user_metadata.start_page = "/category/flute";
  
  var r = await manager.updateUserMetadata({id: u.user_id}, user_metadata);
  console.log("Updated user metadata");
  console.log(r);
})();
*/


// First step of user self-promotion (up to the user submitting their request)
router.get('/user/promote', permissions.checkPermission("users:view"), function(req, res, next)
{
  req.session.promotion_attempts 
  
  // Render the self-promotion page
  res.render("user_promote.pug");
});

// Second step of the self-promotion (after a user submits their request)
// Note that a user can only promote themself if they're actually logged in
router.post('/user/promote', permissions.ensureAuthenticated, async function(req, res, next)
{
  // Limit the retry rate
//  logger.info(req.session.self_promotion_tries.join(','));

  req.session.self_promotion_tries =  req.session.self_promotion_tries || [];
  
  var now = Date.now();
  req.session.self_promotion_tries.push(now);
  
  var t_timeout = now -  10 * 60 * 1000;    // Use a 10 minute timeout
  
  // Only keep track of attempts that occurred within the last 10 minutes
  req.session.self_promotion_tries = req.session.self_promotion_tries.filter( (t) => t > t_timeout );

  var n = req.session.self_promotion_tries.length;
  
  if(n > 3)
  {
    return res.status(403).send("Too many self-promotion attempts have been made. Please wait 10 minutes before trying again.");
  } 

//  logger.info(req.body, global.config.self_promotion);
//  logger.info("headers", req.headers);
  logger.info("User self-promotion attempt: ip", req.ip, "tries", n);
//  logger.info("limiter", limiter);
  
  if(global.config.self_promotion
    && global.config.self_promotion[req.body.user]
    && global.config.self_promotion[req.body.user].password == req.body.password)
  {
    try
    {
      var result = await manager.assignRolestoUser({id: req.user.user_id}, {roles: global.config.self_promotion[req.body.user].roles});            
        
      // Get new user info
      var uroles = await manager.getUserRoles({id: req.user.user_id, per_page: 100});
//      var upermissions = await manager.getUserPermissions({id: req.user.user_id, per_page: 100});

      var roles = uroles.map(i => i.name);
//      logger.info(uroles.map(i => i.name));
//      req.user.roles = uroles.map(i => i.name);

//      logger.info(upermissions.map(i => i.permission_name));
//      req.user.permissions = upermissions.map(i => i.permission_name);

      // Tell the authorities!
      email(
      {
        subject: "Sietch: " + req.user.displayName + " self-promoted",
        text: `${req.user.displayName} (${req.user.emails[0].value}) just self-promoted using username ${req.body.user}.\n\n`
            + `Their new roles are:\n`
            +   roles.join("\n")
      })
        
//      limiter.reset(req);

      // Render the promotion success page
      res.render("user_promoteSuccess.pug", {roles});
    }
    catch(err)
    {
      logger.info(err);
      logger.info(err.stack);
    }
  }
  else
  {
    var message = `Invalid user/password. You are permitted only 3 self-promotion attempts before being locked out for 10 minutes.`;
      
    res.render("user_promote.pug", {message});
  }
});


// View a list of all Sietch users
router.get('/users', permissions.checkPermissionJson('users:view'), async function(req, res, next)
{
  // Render the users list page
  res.render("list_users.pug");
});


// Edit a user
router.get('/user/edit/:user_id?', permissions.checkAuthenticated, async function(req, res, next)
{
  // Render the user editing page
  res.render("edit_user.pug", {user_id: req.params.user_id});
});


// View the current user's public profile
router.get('/user/profile/:userId?', permissions.checkPermission("users:view"), async function(req, res, next)
{
  var user_id = req.user.user_id;
  
  if(req.params.userId)
  {
    user_id = decodeURIComponent(req.params.userId);
  }

//  logger.info("Looking up", user_id);
//  logger.info(await manager.getUserRoles({id: user_id}))

  var [userProfile, userRoles] = await Promise.all(
  [
    manager.getUser({id: user_id}),
    manager.getUserRoles({id: user_id})
  ]);
  
  if(Array.isArray(userProfile))
  {
    return res.status(400).send("More than one user matched");
  }
  
  if(!userProfile)
  {
    return res.status(400).send("No user with that ID");
  }
  
//  logger.info(user);

  // Render the user profile page
  res.render("user_profile.pug", {userProfile, userRoles});
});


// First step of listing the machine-to-machine (m2m) users
const m2m = require("lib/m2m.js");

router.get('/m2mUsers', permissions.checkPermission("users:view"), async function(req, res, next)
{
  var users = await m2m.ListMachineUsers();
  
  // Render the list of m2m users
  res.render("m2mUsers.pug", {users});
});

// Second step of listing the m2m users
router.post('/m2mUsers', permissions.checkPermission("users:edit"), async function(req, res, next)
{
  // Render the credentials page for a specific m2m user
  res.render("m2mUserCredentials.pug",{users: await m2m.AddMachineUser(req.body)});
});

