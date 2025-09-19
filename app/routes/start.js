const ManagementClient = require('auth0').ManagementClient;
const router = require('express').Router();

const { AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET } = require('../lib/constants');
const Admin_Functions = require('../lib/Admin_Functions');
const logger = require('../lib/logger');
const utils = require('../lib/utils');

// Function to convert a dictionary containing key/value pairs to a list of objects
function ConvertDictionaryToList(dictionary) {
  let data = [];

  for (const person in dictionary) {
    data.push({
      api_name: person,
      display_name: dictionary[person],
    });
  }

  return data;
}

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


/// View the home page
router.get('/', async function (req, res, next) {
  // If the user is not logged in, render the splash page
  if (!req.user) return res.render('splash.pug');

  // If the user is logged in and they have a specified start page, redirect there
  if (req.user.user_metadata && req.user.user_metadata.start_page) return res.redirect(302, req.user.user_metadata.start_page);

  // Otherwise (i.e. if the user is logged in but has no specified start page), render the home page  
  return res.render('home.pug');
});


/// View the profile of the currently logged in user
router.get('/user', async function (req, res, next) {
  try {
    // Retrieve the user's information and roles via the Auth0 manager and the user ID taken from the session information
    const [{ data: userProfile }, { data: userRoles }] = await Promise.all([
      manager.users.get({ id: req.user.user_id }),
      manager.users.getRoles({ id: req.user.user_id }),
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


/// List all technicians and other personnel at the UK and US APA factories
router.get(['/json/technicians.json', '/api/technicians.json'], async function (req, res, next) {
  try {
    return res.status(200).json(ConvertDictionaryToList(utils.dictionary_technicians));
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// List personnel who are authorised to signoff on APA frames
router.get(['/json/frameIntakeSignoff.json', '/api/frameIntakeSignoff.json'], async function (req, res, next) {
  try {
    return res.status(200).json(ConvertDictionaryToList(utils.dictionary_frameIntakeSignoff));
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// List personnel who are authorised to signoff on APA frame NCR concessions
router.get(['/json/frameNCRSignoff.json', '/api/frameNCRSignoff.json'], async function (req, res, next) {
  try {
    return res.status(200).json(ConvertDictionaryToList(utils.dictionary_frameNCRSignoff));
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// List Frame Prep D-band personnel
router.get(['/json/dBandFramePrep.json', '/api/dBandFramePrep.json'], async function (req, res, next) {
  try {
    return res.status(200).json(ConvertDictionaryToList(utils.dictionary_dBandFramePrep));
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// List personnel who are authorised to signoff on tension control and winder maintenance verifications
router.get(['/json/winderMaintenanceSignoff.json', '/api/winderMaintenanceSignoff.json'], async function (req, res, next) {
  try {
    return res.status(200).json(ConvertDictionaryToList(utils.dictionary_winderMaintenanceSignoff));
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// List Winding D-band personnel
router.get(['/json/dBandWinding.json', '/api/dBandWinding.json'], async function (req, res, next) {
  try {
    return res.status(200).json(ConvertDictionaryToList(utils.dictionary_dBandWinding));
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// List Post-Production D-band personnel
router.get(['/json/dBandPostProduction.json', '/api/dBandPostProduction.json'], async function (req, res, next) {
  try {
    return res.status(200).json(ConvertDictionaryToList(utils.dictionary_dBandPostProduction));
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// List geometry board metrology technicians at Manchester
router.get(['/json/manchesterTechnicians.json', '/api/manchesterTechnicians.json'], async function (req, res, next) {
  try {
    return res.status(200).json(ConvertDictionaryToList(utils.dictionary_manchesterTechnicians));
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// List yoke load test technicians at UW
router.get(['/json/uwTechnicians.json', '/api/uwTechnicians.json'], async function (req, res, next) {
  try {
    return res.status(200).json(ConvertDictionaryToList(utils.dictionary_uwTechnicians));
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// List personnel who are authorised to signoff on hardware installation at UW
router.get(['/json/uwInstallationSignoff.json', '/api/uwInstallationSignoff.json'], async function (req, res, next) {
  try {
    return res.status(200).json(ConvertDictionaryToList(utils.dictionary_uwInstallationSignoff));
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// List personnel from the CERN Compliance Office
router.get(['/json/cernComplianceOffice.json', '/api/cernComplianceOffice.json'], async function (req, res, next) {
  try {
    return res.status(200).json(ConvertDictionaryToList(utils.dictionary_cernComplianceOffice));
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// List personnel who are authorised to signoff on APA shipment reception
router.get(['/json/apaShipmentReceptionSignoff.json', '/api/apaShipmentReceptionSignoff.json'], async function (req, res, next) {
  try {
    return res.status(200).json(ConvertDictionaryToList(utils.dictionary_apaShipmentReceptionSignoff));
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// List lead personnel at the UK and US APA factories
router.get(['/json/apaFactoryLeads.json', '/api/apaFactoryLeads.json'], async function (req, res, next) {
  try {
    return res.status(200).json(ConvertDictionaryToList(utils.dictionary_apaFactoryLeads));
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// ADMINISTRATOR UTILITY (client-side interface) ... run a specific server-side library function appropriate for the currently required utility, with user input supplied from the Administrator Utility interface page 
router.get('/administratorUtility', async function (req, res, next) {
  res.render('administratorUtility.pug');
});


/// ADMINISTRATOR UTILITY (query to server-side) ... run a specific server-side library function appropriate for the currently required utility, with user input supplied from the Administrator Utility interface page 
router.post(['/json/administratorUtility/:inputString', '/api/administratorUtility/:inputString'], async function (req, res, next) {
  try {
    logger.info(req.body, `Submission to /json/administratorUtility/${req.params.inputString}`);

    const result = await Admin_Functions.updateComponentLocations(req.params.inputString);    // Change as appropriate for the required utility

    return res.status(201).json(result);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


module.exports = router;
