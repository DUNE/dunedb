
'use strict';

const express = require('express');
const m2m = require("lib/m2m.js");
var ManagementClient = require('auth0').ManagementClient;
var permissions = require('lib/permissions.js');
const { AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET } = require('../lib/constants');

/// To ensure the manager below works:
///    - go to auth0 dashboard -> Applications -> APIs -> Auth0ManagementAPI
///    - go to the "Machine to Machine Applications" tab
///    - set the application to "Authorized"
///    - using the pulldown arrow on the right, authorize the scopes given below
/// There is no issue using the same 'clientId' and 'clientSecret' that we use for the main authentication
var manager = new ManagementClient({domain      : AUTH0_DOMAIN,
                                    clientId    : AUTH0_CLIENT_ID,
                                    clientSecret: AUTH0_CLIENT_SECRET,
                                    scope       : 'read:users update:users read:roles'});

var router = express.Router();
module.exports = router;


// List all human users
router.get('/users', permissions.checkPermission("users:view"), async function(req, res, next)
{
  // Render the page for showing a list of all human users
  res.render("list_users.pug");
});


// List all 'machine-to-machine' (m2m) users
// NOTE: this page also allows individual m2m users to be edited, so requires permission beyond simple user viewing
router.get('/users/m2m', permissions.checkPermission("users:edit"), async function(req, res, next)
{
  // Retrieve a list of all m2m users
  var users = await m2m.ListMachineUsers();
  
  // Render the page for showing a list of all m2m users
  res.render("list_m2mUsers.pug", {users});
});


// View the currently logged in user's profile
router.get('/user/profile', async function(req, res, next)
{
  // Get the user ID from the current user's session information
  var userId = req.user.user_id;
  
  // Get the user's information and roles via the connection to Auth0
  var [userProfile, userRoles] = await Promise.all(
  [
    manager.getUser({id: userId}),
    manager.getUserRoles({id: userId})
  ]);
  
  // Throw an error if there is more than one user with the same ID
  if(Array.isArray(userProfile))
  {
    return res.status(400).send("There is more than one user with ID: " + userId);
  }
  
  // Throw an error if there is no user with the provided ID
  if(!userProfile)
  {
    return res.status(400).send("There is no user with ID: " + userId);
  }
  
  // Render the page for viewing the user profile
  res.render("user_profile.pug", {userProfile,
                                  userRoles});
});

