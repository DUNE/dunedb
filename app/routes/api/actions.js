const router = require('express').Router();

const Actions = require('../../lib/Actions');
const logger = require('../../lib/logger');
const Search_ActionsWorkflows = require('../../lib/Search_ActionsWorkflows');
const permissions = require('../../lib/permissions');
const utils = require('../../lib/utils');


/// Retrieve a single version of an action record (either the most recent, or a specified one)
router.get('/action/:actionId([A-Fa-f0-9]{24})', permissions.checkPermissionJson('actions:view'), async function (req, res, next) {
  try {
    // Set up a query object consisting of the specified action ID and a version number if one is provided (if not, the most recent version is assumed)
    let query = { actionId: req.params.actionId };

    if (req.query.version) query['validity.version'] = parseInt(req.query.version, 10);

    // Retrieve the specified version of the record
    // If there is no record corresponding to the ID, or the version number is not valid, this returns 'null'
    const action = await Actions.retrieve(query);

    // Return the record in JSON format
    return res.json(action);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Save a new or edited action record
router.post('/action', permissions.checkPermissionJson('actions:perform'), async function (req, res, next) {
  try {
    // Display a logger message indicating that a record is being saved via the '/action' route
    logger.info(req.body, 'Submission to /action');

    // Save the record ... if successful, this returns the action ID
    const actionId = await Actions.save(req.body, req);

    // Return the record's action ID
    return res.json(actionId);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Add one or more base64-encoded strings, each one representing a single image, to an action record
router.post('/action/:actionId([A-Fa-f0-9]{24})/addImages', permissions.checkPermissionJson('actions:perform'), async function (req, res, next) {
  try {
    // Add the encoded strings to the action record corresponding to the specified action ID ... if successful, the function returns the action ID
    // The encoded strings are contained as an array in the 'req.body.image' parameter (it is passed as a [key, value] pair, with the key being 'images' and the value being the array)
    const result = await Actions.addImageStrings(req.params.actionId, req.body.images);

    // Return the record's action ID
    return res.json(result);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Retrieve a list of all actions of a single action type
router.get('/actions/:typeFormId/list', permissions.checkPermissionJson('actions:view'), async function (req, res, next) {
  try {
    // Retrieve records of all actions with the specified action type
    // The first argument should be an object consisting of the match condition, i.e. the type form ID to match to
    const actions = await Actions.list({ typeFormId: req.params.typeFormId }, { limit: 200 });

    // Extract only the ID field (in string format) from each action record, and save it into a list to be returned
    let actionIDs = [];

    for (const action of actions) {
      actionIDs.push(action.actionId);
    }

    // Return the list of action IDs
    return res.json(actionIDs);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Compare wire tension measurements across locations
router.get('/actions/tensionComparisonAcrossLocations/' + utils.uuid_regex + '/:wireLayer/:origin/:destination', async function (req, res, next) {
  try {
    // Retrieve wire tension measurements that have been performed on a specified wire layer of a specified Assembled APA at two specified locations
    // If successful, this returns an object containing the measured tensions on both sides at both locations, along with the pre-calculated differences between tensions
    const tensions = await Search_ActionsWorkflows.tensionComparisonAcrossLocations(req.params.uuid, req.params.wireLayer, req.params.origin, req.params.destination);

    // Return the object in JSON format
    return res.json(tensions);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


module.exports = router;
