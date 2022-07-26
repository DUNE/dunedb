const router = require('express').Router();

const Actions = require('lib/Actions.js');
const logger = require('../../lib/logger');
const permissions = require("lib/permissions.js");


/// Retrieve the most recent version of a single action record
router.get('/action/:actionId([A-Fa-f0-9]{24})', permissions.checkPermissionJson('actions:view'), async function (req, res, next) {
  try {
    // Retrieve the most recent version of the record corresponding to the specified action ID
    const action = await Actions.retrieve(req.params.actionId);

    // Return the record in JSON format
    return res.json(action, null, 2);
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

    // Save the record
    const action = await Actions.save(req.body, req);
    res.json(action.actionId);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


module.exports = router;
