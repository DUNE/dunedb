const router = require('express').Router();
const ShortUUID = require('short-uuid')();

const Components = require('lib/Components.js');
const logger = require('../../lib/logger');
const permissions = require('lib/permissions.js');
const utils = require('lib/utils.js');


/// Retrieve the most recent version of a single component record
router.get('/component/' + utils.uuid_regex, permissions.checkPermissionJson('components:view'), async function (req, res, next) {
  try {
    // Retrieve the most recent version of the record corresponding to the specified component UUID
    // If there is no record corresponding to the UUID, this returns 'null'
    // check on the server side for whether we have a base 57 or base 58 shortuuid
    // TODO: clean this up to avoid 3 queries in rapid succession when short uuids are passed or component doesn't exist
    const {uuid} = req.params;
    let component = await Components.retrieve(uuid);
    if( !component ){
      const uuid58 = ShortUUID().toUUID(uuid);
      component = await Components.retrieve(uuid58);
    }
    if( !component ){
      const uuid57 = ShortUUID('23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz').toUUID(uuid);
      component = await Components.retrieve(uuid57);
    }
    if( !component ) return res.status(404).json({error: "Component not found" });
    
    // Return the record in JSON format
    return res.json(component);
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
    const componentUuid = shortuuid.toUUID(req.params.shortuuid);

    // Return the full UUID
    return res.json(componentUuid);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


module.exports = router;
