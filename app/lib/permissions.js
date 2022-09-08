/// For human users (logged in via Auth0 and the passport), look for the correct permission in the 'req.user.permissions' object
/// Individual user permissions are granted based on the user's role ... this can ONLY be modified through the Auth0 Dashboard -> Users -> Roles
///
/// For M2M clients, the permissions are found in the DECODED access token (decoding is performed via the middleware function in '/app/lib/auth.js')
/// Once decoded and extracted, the client permissions are also saved into the 'req.user.permissions' object and can be used equivalently to those of human users
/// Client permissions can be edited through the Auth0 Dashboard -> Applications -> 'DUNE DB M2M' -> APIs -> 'DUNE DB API' -> dropdown menu on the right
///
/// NOTE: in the API, set RBAC to 'on', add user permissions to access token, and allow for skipping user consent


/// Check that the currently logged in user has a specified permission
/// This version of the permissions check is for when only the 'req.user' object is available, instead of the full 'req' object
function userHas(user, required_permission) {
  // Check if the list of permissions in the 'user.permissions' object includes the specified one, and return the result of the check (true or false)
  return user.permissions.includes(required_permission);
}


/// Check that the currently logged in user has a specified permission
/// This version of the permission check is for when the entire 'req' object is provided (so that checks on other aspects of it can and/or should be performed first)
function hasPermission(req, required_permission) {
  // Check if the provided 'req' object contains user information (i.e. if the user is logged in)
  if (!req.user) return false;

  // Check if the user information contains a list of permissions (this should always be the case, but just on the off chance ...)
  if (!req.user.permissions) throw new Error(`permissions::hasPermission() - the 'req.user' object does not contain 'permissions'!`);

  // Check if the specified permission is present in the 'req.user' object
  return userHas(req.user, required_permission);
}


/// Check that the currently logged in user has a specified permission
/// This version of the permission check is used inline as part of user interface routing, and returns either the continuation of the route, or a redirection to an error page
function checkPermission(required_permission) {
  return function (req, res, next) {
    // If the user has the specified permission, continue to the next step in the routing process
    if (hasPermission(req, required_permission)) return next();

    // If the user does not have the permission, redirect them to the page for showing the permissions error
    return res.status(403).render('user_permissionError.pug', { required_permission });
  }
}


/// Check that the currently logged in user has a specified permission
/// This version of the permission check is used inline as part of API routing, and returns either the continuation of the route, or an error in JSON format
function checkPermissionJson(required_permission) {
  return function (req, res, next) {
    // If the user has the particular permission, continue to the next step in the routing process
    if (hasPermission(req, required_permission)) return next();

    // If the user does not have the permission, return the permissions error in JSON format
    const result = { error: `Incorrect permissions - you need ${required_permission}, but have ${(req.user.permissions).join(', ')}` };
    return res.status(403).json(result);
  }
}


module.exports = {
  userHas,
  hasPermission,
  checkPermission,
  checkPermissionJson,
}
