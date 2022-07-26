const ManagementClient = require('auth0').ManagementClient;
const router = require('express').Router();

const { BASE_URL, AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET } = require("../../lib/constants");
const logger = require('../../lib/logger');
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






router.get("/m2mUsers", permissions.checkPermissionJson("users:edit"),
  async (req, res, next) => {
    try {
      res.json(await m2m.ListMachineUsers());
    } catch (err) {
      logger.info({ route: req.route.path }, err.message);
      res.status(400).json({ error: err.toString() });
    }
  }
)

router.post("/m2mUser/delete", permissions.checkPermissionJson("users:edit"),
  async (req, res, next) => {
    try {
      return res.json(await m2m.DeleteMachineUser(req.body.user_id));
    } catch (err) {
      logger.info({ route: req.route.path }, err.message);
      res.status(400).json({ error: err.toString() });
    }
  }
);

// Modify or add a machine user.
router.post("/m2mUser", permissions.checkPermissionJson("users:edit"),
  async (req, res, next) => {
    try {

      var rec = await m2m.AddMachineUser(
        {
          user_id: req.body.user_id,
          displayName: req.body.displayName,
          email: req.body.email,
          permissions: req.body.permissions
        }
      );
      var output_record = {
        url: BASE_URL,
        client_credentials: {
          user_id: rec.user_id,
          secret: rec.secret,
        }
      };
      return res.json(output_record);

    } catch (err) {
      logger.info({ route: req.route.path }, err.message);
      res.status(400).json({ error: err.toString() });
    }
  }
)


module.exports = router;
