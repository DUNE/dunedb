
"use strict";


// These are permissions granted to users who are not logged in.
global.config.default_permissions = global.config.default_permissions ||
                                    ['components:view', 'tests:view', 'forms:view', 'jobs:view'];

// const default_user_permissions = global.config.default_user_permissions || [ 
//                                   'components:create', 'components:edit', 'tests:edit', 'tests:submit', 'jobs:view', 'forms:edit', 'jobs:edit', 'jobs:submit', 'jobs:process'];

// route middleware to make sure a user is logged in
// Now I know how to use these:
//
// For regular user logins through passport, you just need to look at req.user.permissions
// and check for the right permission type.  Edit this on auth0 dashboard, under 'users'

// For machine-to-machine logins, you look at req.user.scopes to see if it's there. 
// Edit this in auth0 dashboard - APIs - machine2machine - click the dropdown on the right next to 'authorized'
// to set the permissions

// NB In API,  RBAC on, add permissions to access token, allow skipping user consent,

// function userPermissions(req) 
// {
//   var scopes = default_permissions;
//   if(req.user) {
//     scopes = scopes.concat(default_user_permissions);
//     scopes = scopes.concat(req.user.permissions || req.user.scopes || []);
//   }
//   return scopes;  
// }

function userHas(user,required_permission)
{
  var p = required_permission;
  if( global.config.deployment=='devsite'
   || global.config.deployment=='laptop') 
    p = "dev:"+required_permission;
  return ((user||{}).permissions||[]).includes(p);
}


function hasPermission(req,required_permission)
{
  // if(req.user && config.all_users_have_all_permissions) return true;
  // var permissions = userPermissions(req);
  // return permissions.includes(scope_required)

  // Newer version: use auth0 rules to ensure that default 'user' role is applied to new users.
  // Then set those permissions to the defaults
  if(!req.user) return false;
  if(!req.user.permissions) throw new Error("permissions not available in req.user");
  return userHas(req.user,required_permission);
}

// Middleware to check a scope
function checkPermission(required_permission) {
  return function(req,res,next)
  {
    if(hasPermission(req,required_permission)) return next();
    var p = required_permission;
     if( global.config.deployment=='devsite'
      || global.config.deployment=='laptop') 
      p = "dev:"+required_permission;
     return res.status(400).render('permissionsError.pug',{required_permission:p});
  }
}

// Same, but returns error in JSON format.
function checkPermissionJson(required_permission) {
  return function(req,res,next)
  {
    if(hasPermission(req,required_permission)) return next();
    var p = required_permission;
    if( global.config.deployment=='devsite'
     || global.config.deployment=='laptop') 
     p = "dev:"+required_permission;
    logger.info("Check Permission Failed")
    logger.info(req.user);
    logger.info(p,req.user.permissions)
    return res.status(400).json({error:"Insufficient privileges. Need "+p+" have "+req.user.permissions.join(',')})
  }
}

// This checks to see if they are authenticated in any way, and simply fails if they are not.
function checkAuthenticated (req, res, next) {
    if (req.user) { return next(); }
    return res.status(400).send("You need to be logged in or authenticated to access this resource");
};

function checkAuthenticatedJson (req, res, next) {
  if (req.user) { return next(); }
  return res.status(400).json({error:"You need to be logged in or authenticated to access this resource"});
};


//  middleware: ensure authenticated, with redirect if they are not.
const { requiresAuth } = require('express-openid-connect');
var myReqAuth = requiresAuth();

function ensureAuthenticated (req, res, next) {
    if (req.user) { return next(); }
    req.session.returnTo = req.originalUrl;
    return myReqAuth(req,res,next)
    // res.redirect('/login');
};





module.exports = 
{
  // userPermissions,
  userHas,
  hasPermission,
  checkPermission,
  checkPermissionJson,
  ensureAuthenticated,
  checkAuthenticated,
  checkAuthenticatedJson,

}
