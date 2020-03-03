
var config = require('./configuration.js');


const default_permissions = config.default_permissions || ['components:view', 'tests:view', 'forms:view']

// route middleware to make sure a user is logged in
// Now I know how to use these:
//
// For regular user logins through passport, you just need to look at req.user.permissions
// and check for the right permission type.  Edit this on auth0 dashboard, under 'users'

// For machine-to-machine logins, you look at req.user.scopes to see if it's there. 
// Edit this in auth0 dashboard - APIs - machine2machine - click the dropdown on the right next to 'authorized'
// to set the permissions

// NB In API,  RBAC on, add permissions to access token, allow skipping user consent,

function hasPermission(req,scope_required)
{
  if(req.user && config.all_users_have_all_permissions) return true;
	var user = req.user || {};
	var scopes = default_permissions.concat(user.permissions || user.scopes || []);
	return scopes.includes(scope_required);
}

// Middleware to check a scope
function checkPermission(scope_required) {
	return function(req,res,next)
	{
    if(req.user && config.all_users_have_all_permissions) return next();
		var user = req.user || {};
		var scopes = default_permissions.concat(user.permissions || user.scopes || []);
		if(scopes.includes(scope_required)) return next();
		return res.status(400).render('permissionsError.pug',{scope_required:scope_required,user_scopes:scopes})
	}
}

// Same, but returns error in JSON format.
function checkPermissionJson(scope_required) {
	return function(req,res,next)
	{
    if(req.user && config.all_users_have_all_permissions) return next();

		var user = req.user || {};
		var scopes = default_permissions.concat(user.permissions || user.scopes || []);
		if(scopes.includes(scope_required)) return next();
		console.log("Check Permission Failed")
		console.log(user)
		console.log(scope_required,scopes)
		return res.status(400).json({error:"Insufficient privileges. Need "+scope_required+"; have "+scopes.join(',')})
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


function hasFormEditPrivs(req)
{
	return checkPermissions("edit:forms")
}
	
function hasDataEditPrivs(req)
{
	return checkPermissions("edit:")
}

function hasDataEntryPrivs(req)
{
	return true;
}

function hasDataViewPrivs(req)
{
	return true;
}



function middlewareCheckFormEditPrivs(req,res,next) 
{
	if(hasFormEditPrivs(req)) return next();
	else return res.status(300).send("User does not have Form Edit priviledges");
}

function middlewareCheckDataEditPrivs(req,res,next) 
{
	if(hasDataEditPrivs(req)) return next();
	else return res.status(300).send("User does not have Data Edit priviledges");
}

function middlewareCheckDataEntryPrivs(req,res,next) 
{
	if(hasDataEntryPrivs(req)) return next();
	else return res.status(300).send("User does not have Data Entry priviledges");
}

function middlewareCheckDataViewPrivs(req,res,next) 
{
	if(hasDataViewPrivs(req)) return next();
	else return res.status(300).send("User does not have Data View priviledges");
}





module.exports = 
{
	hasPermission,
	checkPermission,
	checkPermissionJson,
	ensureAuthenticated,
	checkAuthenticated,
	checkAuthenticatedJson,

	// hasFormEditPrivs,
	// hasDataEditPrivs, 
	// hasDataEntryPrivs,
	// hasDataViewPrivs,
	// middlewareCheckFormEditPrivs,
	// middlewareCheckDataEditPrivs,
	// middlewareCheckDataEntryPrivs,
	// middlewareCheckDataViewPrivs,
}
