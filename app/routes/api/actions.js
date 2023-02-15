const router = require('express').Router();

const Actions = require('../../lib/Actions');
const logger = require('../../lib/logger');
const permissions = require('../../lib/permissions');


/// Retrieve the most recent version of a single action record
router.get('/action/:actionId([A-Fa-f0-9]{24})', permissions.checkPermissionJson('actions:view'), async function (req, res, next) {
  try {
    // Retrieve the most recent version of the record corresponding to the specified action ID
    // If there is no record corresponding to the ID, this returns 'null'
    const action = await Actions.retrieve(req.params.actionId);

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


module.exports = router;
