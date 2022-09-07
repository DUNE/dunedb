const ManagementClient = require('auth0').ManagementClient;
const router = require('express').Router();

const { AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET } = require('../lib/constants');
const logger = require('../lib/logger');
const permissions = require('lib/permissions.js');

/// To ensure the manager below works:
///    - go to Auth0 Dashboard -> Applications -> APIs -> Auth0ManagementAPI
///    - go to the 'Machine to Machine Applications' tab
///    - set the 'DUNE DB' application to 'Authorized' (NOT the one with 'M2M' in the application name)
///    - using the pulldown arrow on the right to authorise the scopes given below
/// There is no issue using the same 'clientId' and 'clientSecret' that we use for the main authentication
const manager = new ManagementClient({
  domain: AUTH0_DOMAIN,
  clientId: AUTH0_CLIENT_ID,
  clientSecret: AUTH0_CLIENT_SECRET,
  scope: 'read:users update:users read:roles'
});


/// View the profile of the currently logged in user
router.get('/user', async function (req, res, next) {
  try {
    // Retrieve the user's information and roles via the Auth0 manager and the user ID taken from the session information
    const [userProfile, userRoles] = await Promise.all([
      manager.getUser({ id: req.user.user_id }),
      manager.getUserRoles({ id: req.user.user_id }),
    ]);

    // Throw an appropriate error if there is not exactly one user with the provided ID
    if (!userProfile) return res.status(404).send(`There is no user profile with user ID = ${req.user.user_id}`);
    if (Array.isArray(userProfile)) return res.status(404).send(`There is more than one user profile with user ID = ${req.user.user_id}`);

    // Render the interface page
    res.render('user.pug', {
      userProfile,
      userRoles,
    });
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// List all human users
router.get('/users/list', permissions.checkPermission('users:view'), async function (req, res, next) {
  try {
    // Render the interface page
    res.render('user_list.pug');
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


module.exports = router;
