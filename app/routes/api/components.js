const router = require('express').Router();
const ShortUUID = require('short-uuid');

const Components = require('lib/Components.js');
const logger = require('../../lib/logger');
const permissions = require('lib/permissions.js');
const utils = require('lib/utils.js');


/// Retrieve the most recent version of a single component record
router.get('/component/' + utils.uuid_regex, permissions.checkPermissionJson('components:view'), async function (req, res, next) {
  try {
    // Retrieve the most recent version of the record corresponding to the specified component UUID
    // If there is no record corresponding to the UUID, this returns 'null'
    const component = await Components.retrieve(req.params.uuid);

    // Return the record in JSON format
    return res.json(component);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Confirm that a specified short UUID corresponds to the full UUID in an existing component record
router.get('/confirmShortUUID/' + utils.short_uuid_regex, async function (req, res, next) {
  try {
    // A short UUID may be encoded in one of two formats: base 58 (the default encoding alphabet used by the 'short-uuid' library), or base 57

    // First, decode a full UUID from the specified short one using the base 58 alphabet, and attempt to find a corresponding component record
    let uuid = ShortUUID().toUUID(req.params.shortuuid);
    let component = await Components.retrieve(uuid);

    // If there is no component record found, do the same again but now using the base 57 alphabet to decode the full UUID
    if (!component) {
      uuid = ShortUUID('23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz').toUUID(req.params.shortuuid);
      component = await Components.retrieve(uuid);
    }

    // If there is still no record found, return an appropriate error message
    if (!component) return res.status(404).json({ error: `There is no component record with component UUID = ${uuid}` });

    // Otherwise, return the full UUID that corresponded to an existing component record
    return res.json(uuid);
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

    // Save the record ... if successful, this returns the complete component record
    const component = await Components.save(req.body, req);

    // Return the record's component UUID
    return res.json(component.componentUuid);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Generate a new component UUID
router.get('/newComponentUUID', async function (req, res, next) {
  try {
    // Create a new full UUID
    const componentUuid = Components.newUuid().toString();

    // Return the newly generated UUID
    return res.json(componentUuid);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Convert a short UUID to a full UUID
router.get('/convertShortUUID/' + utils.short_uuid_regex, async function (req, res, next) {
  try {
    // Reconstruct the full UUID from the shortened UUID
    const componentUuid = ShortUUID().toUUID(req.params.shortuuid);

    // Return the full UUID
    return res.json(componentUuid);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


module.exports = router;
