const ManagementClient = require('auth0').ManagementClient;
const router = require('express').Router();

const { AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET } = require('../lib/constants');
const logger = require('../lib/logger');
const m2m = require('lib/m2m.js');
const permissions = require('lib/permissions.js');

/// To ensure the manager below works:
///    - go to Auth0 Dashboard -> Applications -> APIs -> Auth0ManagementAPI
///    - go to the "Machine to Machine Applications" tab
///    - set the application to "Authorized"
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
    // Retrieve the user's information and roles via the connection to Auth0 and the user ID taken from the session information
    const [userProfile, userRoles] = await Promise.all([
      manager.getUser({ id: req.user.user_id }),
      manager.getUserRoles({ id: req.user.user_id }),
    ]);

    // Throw an error if there is more than one user with the provided ID
    if (Array.isArray(userProfile)) return res.status(404).send(`There is more than one user profile with user ID = ${req.user.user_id}`);

    // Throw an error if there is no user corresponding to the provided ID
    if (!userProfile) return res.status(404).send(`There is no user profile with user ID = ${req.user.user_id}`);

    // Render the interface page for viewing a user's profile
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
    // Render the interface page for listing all human users
    res.render('user_list.pug');
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// List all 'machine-to-machine' (m2m) users
/// This route also allows individual m2m users to be edited, so requires permission beyond simple user viewing
router.get('/users/m2m', permissions.checkPermission("users:edit"), async function (req, res, next) {
  try {
    // Retrieve a list of all m2m users
    const users = await m2m.ListMachineUsers();

    // Render the interface page for listing all m2m users
    res.render('list_m2mUsers.pug', { users });
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


module.exports = router;
