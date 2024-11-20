const ManagementClient = require('auth0').ManagementClient;
const router = require('express').Router();

const { AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET } = require('../../lib/constants');
const logger = require('../../lib/logger');
const permissions = require('../../lib/permissions');
const utils = require('../../lib/utils');

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


/// List all human users
router.get('/users/list', permissions.checkPermissionJson('users:view'), async function (req, res, next) {
  try {
    // Get a list of all available roles in the Auth0 tenant
    const all_user_roles = await manager.getRoles(req.query);

    // Set up a matrix of which users have which roles
    let promises = [];

    for (const role of all_user_roles) {
      promises.push(manager.getUsersInRole({
        id: role.id,
        per_page: 100,
      }))
    }

    const role_results = await Promise.all(promises);

    // Collect and collate all information and roles into an object, with one entry per user and each entry keyed by user ID
    let user_data = {};

    for (let i = 0; i < all_user_roles.length; i++) {
      for (const u of role_results[i]) {
        user_data[u.user_id] = user_data[u.user_id] || u;
        user_data[u.user_id].roles = user_data[u.user_id].roles || [];
        user_data[u.user_id].roles.push(all_user_roles[i].name);
      }
    }

    // Return the list of users in JSON format
    return res.json(Object.values(user_data));
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// List general technicians at the UK and US APA factories
router.get('/technicians.json', async function (req, res, next) {
  try {
    let data = [];

    for (const person in utils.dictionary_technicians) {
      data.push({
        api_name: person,
        display_name: utils.dictionary_technicians[person],
      });
    }

    return res.json(data);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// List personnel who are authorised to sign-off on APA frame and grounding mesh intake (including both types of frame survey results)
router.get('/frameIntakeSignoff.json', async function (req, res, next) {
  try {
    let data = [];

    for (const person in utils.dictionary_frameIntakeSignoff) {
      data.push({
        api_name: person,
        display_name: utils.dictionary_frameIntakeSignoff[person],
      });
    }

    return res.json(data);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// List personnel who are authorised to sign-off on APA frame NCR concessions
router.get('/frameNCRSignoff.json', async function (req, res, next) {
  try {
    let data = [];

    for (const person in utils.dictionary_frameNCRSignoff) {
      data.push({
        api_name: person,
        display_name: utils.dictionary_frameNCRSignoff[person],
      });
    }

    return res.json(data);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// List geometry board metrology technicians at Manchester
router.get('/manchesterTechnicians.json', async function (req, res, next) {
  try {
    let data = [];

    for (const person in utils.dictionary_manchesterTechnicians) {
      data.push({
        api_name: person,
        display_name: utils.dictionary_manchesterTechnicians[person],
      });
    }

    return res.json(data);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// List personnel who are authorised to sign-off on tension controls
router.get('/tensionControlSignoff.json', async function (req, res, next) {
  try {
    let data = [];

    for (const person in utils.dictionary_tensionControlSignoff) {
      data.push({
        api_name: person,
        display_name: utils.dictionary_tensionControlSignoff[person],
      });
    }

    return res.json(data);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// List personnel who are authorised to sign-off on winder maintenance
router.get('/winderMaintenanceSignoff.json', async function (req, res, next) {
  try {
    let data = [];

    for (const person in utils.dictionary_winderMaintenanceSignoff) {
      data.push({
        api_name: person,
        display_name: utils.dictionary_winderMaintenanceSignoff[person],
      });
    }

    return res.json(data);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// List PCB technicians at UW
router.get('/uwPCBTechnicians.json', async function (req, res, next) {
  try {
    let data = [];

    for (const person in utils.dictionary_uwPCBTechnicians) {
      data.push({
        api_name: person,
        display_name: utils.dictionary_uwPCBTechnicians[person],
      });
    }

    return res.json(data);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// List personnel who are authorised to approve PCBs at UW
router.get('/uwPCBApproval.json', async function (req, res, next) {
  try {
    let data = [];

    for (const person in utils.dictionary_uwPCBApproval) {
      data.push({
        api_name: person,
        display_name: utils.dictionary_uwPCBApproval[person],
      });
    }

    return res.json(data);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// List hardware installation technicians at UW
router.get('/uwInstallationTechnicians.json', async function (req, res, next) {
  try {
    let data = [];

    for (const person in utils.dictionary_uwInstallationTechnicians) {
      data.push({
        api_name: person,
        display_name: utils.dictionary_uwInstallationTechnicians[person],
      });
    }

    return res.json(data);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// List personnel who are authorised to approve hardware installation at UW
router.get('/uwInstallationApproval.json', async function (req, res, next) {
  try {
    let data = [];

    for (const person in utils.dictionary_uwInstallationApproval) {
      data.push({
        api_name: person,
        display_name: utils.dictionary_uwInstallationApproval[person],
      });
    }

    return res.json(data);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// List lead personnel at the UK and US APA factories
router.get('/apaFactoryLeads.json', async function (req, res, next) {
  try {
    let data = [];

    for (const person in utils.dictionary_apaFactoryLeads) {
      data.push({
        api_name: person,
        display_name: utils.dictionary_apaFactoryLeads[person],
      });
    }

    return res.json(data);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});

module.exports = router;
