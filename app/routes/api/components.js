const router = require('express').Router();
const shortuuid = require('short-uuid')();

const Components = require('lib/Components.js');
const logger = require('../../lib/logger');
const permissions = require('lib/permissions.js');
const utils = require('lib/utils.js');


/// Retrieve the most recent version of a single component record
router.get('/component/' + utils.uuid_regex, permissions.checkPermissionJson('components:view'), async function (req, res, next) {
  try {
    // Retrieve the most recent version of the record corresponding to the specified component UUID
    const component = await Components.retrieve(req.params.uuid);

    // Return the record in JSON format
    return res.json(component, null, 2);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Save a new or edited component record
router.post('/component', permissions.checkPermissionJson('components:edit'), async function (req, res, next) {
  try {
    // Display a logger message indicating that a record is being saved via the '/component' route
    logger.info(req.body, 'Submission to /component');

    // Save the record
    const component = await Components.save(req.body, req);
    res.json(component.componentUuid);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Generate a new component UUID
router.get('/newComponentUUID', async function (req, res, next) {
  try {
    // Display a logger message indicating that a new UUID is being requested via the '/newComponentUUID' route
    logger.info(req.body, 'Request for new UUID from /newComponentUUID');

    // Create a new full UUID
    const componentUuid = Components.newUuid().toString();

    // Set the route response to be the UUID
    res.json(componentUuid);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Convert a short UUID to a full UUID
router.get('/convertShortUUID/' + utils.short_uuid_regex, async function (req, res, next) {
  try {
    // Reconstruct the full UUID from the shortened UUID
    const componentUuid = shortuuid.toUUID(req.params.shortuuid);

    // Set the route response to be the full UUID
    res.json(componentUuid);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


module.exports = router;
