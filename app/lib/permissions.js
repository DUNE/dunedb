const logger = require('./logger');

/// For human users (logged in via Auth0 and the passport), look for the correct permission in the 'req.user.permissions' object
/// Individual user permissions are granted based on the user's role ... this can ONLY be modified through the Auth0 Dashboard -> Users -> Roles
///
/// For M2M clients, the permissions are found in the DECODED access token (decoding is performed via the middleware function in 'auth.js')
/// Once decoded and extracted, the client permissions are also saved into the 'req.user.permissions' object
/// Client permissions can be edited through the Auth0 Dashboard -> Applications -> 'DUNE DB M2M' -> APIs -> 'DUNE DB API' -> dropdown menu on the right
///
/// NB. In the API, set RBAC to 'on', add user permissions to access token, and allow for skipping user consent


/// Check if the specified user information object contains a particular permission
/// This version of the permission check is for when the full 'req' object is not available, or it is unnecessary to use it in its entirety
function userHas(user, required_permission) {
  // Check if the list of user permissions in the information object includes the particular permission
  const result = user.permissions.includes(required_permission);

  // Return the result of the check
  return result;
}


/// Check if a particular permission is present in a given 'req' object
/// This version of the permission check is for when it is better to use the full 'req' object (i.e. to check other aspects of it first)
function hasPermission(req, required_permission) {
  // Check if there is user information available (i.e. if the user is logged in)
  if (!req.user) return false;

  // Check if the user information contains a list of permissions (should always be the case, but just on the off chance ...)
  if (!req.user.permissions) throw new Error(`permissions::hasPermission() - the 'req.user' object does not contain 'permissions'!`);

  // Check if the user information contains the particular permission
  return userHas(req.user, required_permission);
}


/// Check that the currently logged in user has a particular permission
/// This version of the permission check is used 'inline' as part of user interface routing
function checkPermission(required_permission) {
  return function (req, res, next) {
    // If the user has the particular permission, continue to the next step in the routing process
    if (hasPermission(req, required_permission)) return next();

    // If the user does not have the permission, redirect them to the page for showing the permissions error
    return res.status(403).render('user_permissionError.pug', { required_permission });
  }
}


/// Check that the currently logged in user has a particular permission, and return any error in JSON format
/// This version of the permission check is used 'inline' as part of API routing
function checkPermissionJson(required_permission) {
  return function (req, res, next) {
    // If the user has the particular permission, continue to the next step in the routing process
    if (hasPermission(req, required_permission)) return next();

    // If the user does not have the permission, send a message to the logger, and return the error in JSON format
    logger.info({ user: req.user }, `permissions::checkPermissionJson() - permission check failed`);

    var result = { error: `Incorrect permissions - you need ${required_permission}, but have ${(req.user.permissions).join(', ')}` };
    return res.status(403).json(result);
  }
}


module.exports = {
  userHas,
  hasPermission,
  checkPermission,
  checkPermissionJson,
}
