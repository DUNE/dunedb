const router = require('express').Router();

const logger = require('../../lib/logger');
const permissions = require('../../lib/permissions');
const Workflows = require('../../lib/Workflows');


/// Retrieve a single version of a workflow record (either the most recent, or a specified one)
router.get('/workflow/:workflowId([A-Fa-f0-9]{24})', permissions.checkPermissionJson('workflows:view'), async function (req, res, next) {
  try {
    // Set up a query object consisting of the specified workflow ID and a version number if one is provided (if not, the most recent version is assumed)
    let query = { workflowId: req.params.workflowId };

    if (req.query.version) query['validity.version'] = parseInt(req.query.version, 10);

    // Retrieve the specified version of the record
    // If there is no record corresponding to the ID, or the version number is not valid, this returns 'null'
    const workflow = await Workflows.retrieve(query);

    // Return the record in JSON format
    return res.json(workflow);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Save a new or edited workflow record
router.post('/workflow', permissions.checkPermissionJson('workflows:edit'), async function (req, res, next) {
  try {
    // Display a logger message indicating that a record is being saved via the '/workflow' route
    logger.info(req.body, 'Submission to /workflow');

    // Save the record ... if successful, this returns the workflow ID
    const workflowId = await Workflows.save(req.body, req);

    // Return the record's workflow ID
    return res.json(workflowId);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


module.exports = router;
