const router = require('express').Router();
const MUUID = require('uuid-mongodb');
const ShortUUID = require('short-uuid');

const Components = require('../../lib/Components');
const logger = require('../../lib/logger');
const permissions = require('../../lib/permissions');
const Search_OtherComponents = require('../../lib/Search_OtherComponents');


/// Retrieve a single version of a component record via its UUID (either the most recent, or a specified one)
router.get('/component/:uuid', permissions.checkPermissionJson('components:view'), async function (req, res, next) {
  try {
    // Set up a query object consisting of the specified component UUID and a version number if one is provided (if not, the most recent version is assumed)
    let query = { componentUuid: req.params.uuid };

    if (req.query.version) query['validity.version'] = parseInt(req.query.version, 10);

    // Retrieve the specified version of the record
    // If there is no record corresponding to the UUID, or the version number is not valid, this returns 'null'
    const component = await Components.retrieve(query);

    // Return the record in JSON format
    return res.status(201).json(component);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Retrieve the most recent version of a component record via its type form ID and type record number
router.get('/component/:typeFormId/:typeRecordNumber', permissions.checkPermissionJson('components:view'), async function (req, res, next) {
  try {
    // Retrieve a reduced instance of the component record corresponding to the specified type form ID and type record number
    const componentsList = await Search_OtherComponents.componentsByTypeAndNumber(req.params.typeFormId, req.params.typeRecordNumber);

    // If at least one record has been returned, return it in JSON format ... otherwise, return 'null' explicitly (also in JSON format)
    if (componentsList.length > 0) {
      return res.status(201).json(componentsList[0]);
    } else {
      return res.status(201).json(null);
    }

  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Confirm that a specified short UUID corresponds to the full UUID in an existing component record
router.get('/confirmShortUUID/:shortuuid', async function (req, res, next) {
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
    return res.status(201).json(uuid);
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

    // Save the record ... if successful, this returns the component UUID
    const componentUuid = await Components.save(req.body, req);

    // Return the record's component UUID
    return res.status(201).json(componentUuid);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Save all individual sub-component records from a single batch
router.post('/componentBatch', permissions.checkPermissionJson('components:edit'), async function (req, res, next) {
  try {
    // The 'req.body' contains an array of the individual sub-component submission objects, so loop over these and save them one by one
    // Save each sub-component's returned component UUID into an array, and additionally display a logger message indicating that each record is being saved via the '/componentBatch' route
    let componentUuids = [];

    req.body.forEach(function (subComponent) {
      logger.info(subComponent, 'Submission to /componentBatch');

      const componentUuid = Components.save(subComponent, req);
      componentUuids.push(componentUuid);
    });

    // Return the array of sub-component component UUIDs
    return res.status(201).json(componentUuids);
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
    return res.status(201).json(componentUuid);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Retrieve a list of all components of a single component type
router.get('/components/:typeFormId/list', permissions.checkPermissionJson('components:view'), async function (req, res, next) {
  try {
    // Retrieve records of all components with the specified component type
    // The first argument should be an object consisting of the match condition, i.e. the type form ID to match to
    const components = await Components.list({ formId: req.params.typeFormId }, { limit: 500 });

    // Extract only the UUID field (in string format) from each component record, and save it into a list to be returned
    let componentUUIDs = [];

    for (const component of components) {
      componentUUIDs.push(MUUID.from(component.componentUuid).toString());
    }

    // Return the list of UUIDs
    return res.status(201).json(componentUUIDs);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Retrieve a list of geometry board counts across all [board part number, board location] combinations
router.get('/components/boardCounts_byPartNumberAndLocation', permissions.checkPermissionJson('components:view'), async function (req, res, next) {
  try {
    // Retrieve a list of geometry board counts across all [board part number, board location] combinations
    const boardCounts_byPartNumberAndLocation = await Components.boardCounts_byPartNumberAndLocation();

    // Return the list of geometry board counts
    return res.status(201).json(boardCounts_byPartNumberAndLocation);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


module.exports = router;
