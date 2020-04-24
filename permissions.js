
var config = require('./configuration.js');


const default_permissions 	   = config.default_permissions || ['components:view', 'tests:view', 'forms:view']
const default_user_permissions = config.default_user_permissions || [ 
															    'components:edit', 'tests:edit', 'forms:edit']

// route middleware to make sure a user is logged in
// Now I know how to use these:
//
// For regular user logins through passport, you just need to look at req.user.permissions
// and check for the right permission type.  Edit this on auth0 dashboard, under 'users'

// For machine-to-machine logins, you look at req.user.scopes to see if it's there. 
// Edit this in auth0 dashboard - APIs - machine2machine - click the dropdown on the right next to 'authorized'
// to set the permissions

// NB In API,  RBAC on, add permissions to access token, allow skipping user consent,

function userScopes(req) 
{
  var scopes = default_permissions;
  if(req.user) {
  	scopes = scopes.concat(default_user_permissions);
  	scopes = scopes.concat(req.user.permissions || req.user.scopes || []);
  }
  return scopes;  
}

function hasPermission(req,scope_required)
{
  if(req.user && config.all_users_have_all_permissions) return true;
  var scopes = userScopes(req);
  return scopes.includes(scope_required);
}

// Middleware to check a scope
function checkPermission(scope_required) {
	return function(req,res,next)
	{
    	if(hasPermission(req,scope_required)) return next();
		return res.status(400).render('permissionsError.pug',{scope_required:scope_required,user_scopes:userScopes(req)})
	}
}

// Same, but returns error in JSON format.
function checkPermissionJson(scope_required) {
	return function(req,res,next)
	{
    	if(hasPermission(req,scope_required)) return next();
		console.log("Check Permission Failed")
		console.log(user)
		console.log(scope_required,scopes)
		return res.status(400).json({error:"Insufficient privileges. Need "+scope_required+"; have "+userScopes(req).join(',')})
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
function ensureAuthenticated (req, res, next) {
    if (req.user) { return next(); }
    req.session.returnTo = req.originalUrl;
    res.redirect('/login');
};





module.exports = 
{
	hasPermission,
	checkPermission,
	checkPermissionJson,
	ensureAuthenticated,
	checkAuthenticated,
	checkAuthenticatedJson,

}
