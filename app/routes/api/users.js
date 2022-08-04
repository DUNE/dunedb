const ManagementClient = require('auth0').ManagementClient;
const router = require('express').Router();

const { AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET } = require('../../lib/constants');
const logger = require('../../lib/logger');
const permissions = require('lib/permissions.js');

/// To ensure the manager below works:
///    - go to Auth0 Dashboard -> Applications -> APIs -> Auth0ManagementAPI
///    - go to the 'Machine to Machine Applications' tab
///    - set the "DUNE DB" application to 'Authorized' (NOT the one with 'M2M' in the application name)
///    - using the pulldown arrow on the right to authorise the scopes given below
/// There is no issue using the same 'clientId' and 'clientSecret' that we use for the main authentication
const manager = new ManagementClient({
  domain: AUTH0_DOMAIN,
  clientId: AUTH0_CLIENT_ID,
  clientSecret: AUTH0_CLIENT_SECRET,
  scope: 'read:users update:users read:roles'
});


/// List all human users
router.get('/users/list', permissions.checkPermissionJson('users:view'), async function (req, res, next) {
  try {
    // Get a list of all available roles in the Auth0 tenant
    const all_user_roles = await manager.getRoles(req.query);

    // Set up a matrix of which roles belong to which users
    let promises = [];

    for (const role of all_user_roles) {
      promises.push(manager.getUsersInRole({
        id: role.id,
        per_page: 100,
      }))
    }

    const role_results = await Promise.all(promises);

    // Collect and collate all information and roles for each user
    let user_data = {};

    for (let i = 0; i < all_user_roles.length; i++) {
      const role = all_user_roles[i];
      const users_with_role = role_results[i];

      for (const u of users_with_role) {
        user_data[u.user_id] = user_data[u.user_id] || u;
        user_data[u.user_id].roles = user_data[u.user_id].roles || [];
        user_data[u.user_id].roles.push(role.name);
      }
    }

    // Return the list of users in JSON format
    return res.json(Object.values(user_data));
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


module.exports = router;
