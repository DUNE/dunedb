const router = require('express').Router();

const logger = require('../../lib/logger');
const permissions = require("lib/permissions.js");
const Workflows = require("lib/Workflows.js");


/// Retrieve the most recent version of a single workflow record
router.get('/workflow/:workflowId([A-Fa-f0-9]{24})', permissions.checkPermissionJson('workflows:view'), async function (req, res, next) {
  try {
    // Retrieve the most recent version of the record corresponding to the specified workflow ID
    const workflow = await Workflows.retrieve(req.params.workflowId);

    // Return the record in JSON format
    return res.json(workflow, null, 2);
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

    // Save the record
    const workflow = await Workflows.save(req.body, req);
    res.json(workflow.workflowId);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


module.exports = router;
