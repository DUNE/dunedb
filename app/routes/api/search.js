const router = require('express').Router();

const logger = require('../../lib/logger');
const Search_ActionsWorkflows = require('../../lib/Search_ActionsWorkflows');
const Search_GeoBoards = require('../../lib/Search_GeoBoards');
const Search_OtherComponents = require('../../lib/Search_OtherComponents');
const utils = require('../../lib/utils');


/// Search for geometry boards that have been received at a specified location
router.get('/search/geoBoardsByLocation/:location/:acceptanceStatus/:toothStripStatus', async function (req, res, next) {
  try {
    // Retrieve a list of geometry boards, grouped by part number, that have been received at the specified location
    const boardsByPartNumber = await Search_GeoBoards.boardsByLocation(req.params.location, req.params.acceptanceStatus, req.params.toothStripStatus);

    // Return the list in JSON format
    return res.json(boardsByPartNumber);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Search for geometry boards of a specified part number
router.get('/search/geoBoardsByPartNumber/:partNumber/:acceptanceStatus/:toothStripStatus', async function (req, res, next) {
  try {
    // Retrieve a list of geometry boards, grouped by reception location, of the specified part number
    const boardsByLocation = await Search_GeoBoards.boardsByPartNumber(req.params.partNumber, req.params.acceptanceStatus, req.params.toothStripStatus);

    // Return the list in JSON format
    return res.json(boardsByLocation);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Search for geometry boards that have a specified visual inspection disposition
router.get('/search/geoBoardsByVisualInspection/:disposition/:issue', async function (req, res, next) {
  try {
    // Retrieve a list of geometry boards, grouped by part number, that have the specified visual inspection disposition
    const boardsByLocation = await Search_GeoBoards.boardsByVisualInspection(req.params.disposition, req.params.issue);

    // Return the list in JSON format
    return res.json(boardsByLocation);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Search for geometry boards that came from a batch with a specified order number
router.get('/search/geoBoardsByOrderNumber/:orderNumber', async function (req, res, next) {
  try {
    // Retrieve a list of geometry boards, grouped by visual inspection disposition, that came from a batch with the specified order number
    const boardsByDisposition = await Search_GeoBoards.boardsByOrderNumber(req.params.orderNumber);

    // Return the list in JSON format
    return res.json(boardsByDisposition);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Search for geometry board shipments using various shipment reception details
router.get('/search/boardShipmentsByReceptionDetails', async function (req, res, next) {
  try {
    // This search query can have multiple query strings, most of which are optional
    // So first, parse out the strings which have actually been provided (as non-empty strings), and set the rest to 'null'
    // The only required query string is the 'shipment status', which will always have a valid value provided
    const status = req.query.shipmentStatus;
    const origin = (req.query.originLocation !== '') ? req.query.originLocation : null;
    const destination = (req.query.destinationLocation !== '') ? req.query.destinationLocation : null;
    let earliest = (req.query.earliestDate !== '') ? req.query.earliestDate : null;
    let latest = (req.query.latestDate !== '') ? req.query.latestDate : null;
    const comment = (req.query.receptionComment !== '') ? req.query.receptionComment : null;

    // The timestamp part of both date/time strings is supposed to be of the format: 'T00:00:00+01:00', but the '+' character is replaced with a space when they are passed as query strings
    // So replace the space in each string with a '+' to recover the original, correctly formatted timestamp (so that the format matches that of the timestamps in the shipment records)
    if (earliest) earliest = earliest.replace(' ', '+');
    if (latest) latest = latest.replace(' ', '+');

    // Retrieve a list of geometry boards shipments that match the specified reception details
    const shipments = await Search_OtherComponents.boardShipmentsByReceptionDetails(status, origin, destination, earliest, latest, comment);

    // Return the list in JSON format
    return res.json(shipments);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Search for grounding mesh panels that have been received at a specified location
router.get('/search/meshesByLocation/:location', async function (req, res, next) {
  try {
    // Retrieve a list of grounding mesh panels, grouped by part number, that have been received at the specified location
    const meshesByPartNumber = await Search_OtherComponents.meshesByLocation(req.params.location);

    // Return the list in JSON format
    return res.json(meshesByPartNumber);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Search for grounding mesh panels of a specified part number
router.get('/search/meshesByPartNumber/:partNumber', async function (req, res, next) {
  try {
    // Retrieve a list of grounding mesh panels, grouped by reception location, of the specified part number
    const meshesByLocation = await Search_OtherComponents.meshesByPartNumber(req.params.partNumber);

    // Return the list in JSON format
    return res.json(meshesByLocation);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Search for populated board kit components that have been received at a specified location
router.get('/search/boardKitComponentsByLocation/:location', async function (req, res, next) {
  try {
    // Retrieve a list of populated board kit components, grouped by component type, that have been received at the specified location
    const componentsByType = await Search_OtherComponents.boardKitComponentsByLocation(req.params.location);

    // Return the list in JSON format
    return res.json(componentsByType);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Search for workflows that involve a particular component, specified by its UUID
router.get('/search/workflowsByUUID/' + utils.uuid_regex, async function (req, res, next) {
  try {
    // Retrieve a list of workflows that involve the component corresponding to the specified UUID
    const workflows = await Search_ActionsWorkflows.workflowsByUUID(req.params.uuid);

    // Return the list in JSON format
    return res.json(workflows);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Search for assembled APAs by production location and number
router.get('/search/apasByProductionLocationAndNumber/:apaLocation/:apaNumber', async function (req, res, next) {
  try {
    // Retrieve a list of assembled APAs that match the specified record details
    const assembledAPAs = await Search_OtherComponents.apasByProductionLocationAndNumber(req.params.apaLocation, req.params.apaNumber);

    // Return the list in JSON format
    return res.json(assembledAPAs);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Search for assembled APAs by last completed assembly step
router.get('/search/apasByLastCompletedAssemblyStep/:assemblyStep', async function (req, res, next) {
  try {
    // Retrieve a nested list, consisting of:
    // - a list of all assembled APAs that have been completed up to and including the specified step in their assembly workflows
    // - a list of all assembled APAs that have NOT yet reached the specified step in their assembly workflows
    const assembledAPAs = await Search_OtherComponents.apasByLastCompletedAssemblyStep(req.params.assemblyStep);

    // Return the list in JSON format
    return res.json(assembledAPAs);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Search for components of a specified type and type record number
router.get('/search/componentsByTypeAndNumber/:type/:number', async function (req, res, next) {
  try {
    // Retrieve a list of components that match the specified record details
    const components = await Search_OtherComponents.componentsByTypeAndNumber(req.params.type, req.params.number);

    // Return the list in JSON format
    return res.json(components);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Search for non-conformance actions performed on a specified component type
router.get('/search/nonConformanceByComponentType/:componentType/:disposition/:status', async function (req, res, next) {
  try {
    // Retrieve a list of non-conformance actions that match the specified non-conformance details
    const actions = await Search_ActionsWorkflows.nonConformanceByComponentType(req.params.componentType, req.params.disposition, req.params.status);

    // Return the list in JSON format
    return res.json(actions);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Search for non-conformance actions performed on a single component, specified by its UUID
router.get('/search/nonConformanceByUUID/' + utils.uuid_regex, async function (req, res, next) {
  try {
    // Retrieve a list of non-conformance actions that have been performed on the component corresponding to the specified UUID
    const actions = await Search_ActionsWorkflows.nonConformanceByUUID(req.params.uuid);

    // Return the list in JSON format
    return res.json(actions);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Search for actions of a specified type that reference a specified component UUID
router.get('/search/actionsByReferencedUUID/' + utils.uuid_regex + '/:actionType', async function (req, res, next) {
  try {
    // Depending on the specified action type, retrieve a list of actions of the specified type that reference the specified component UUID
    let actions = null;

    if (req.params.actionType === 'boardInstall') {
      actions = await Search_ActionsWorkflows.boardInstallByReferencedComponent(req.params.uuid);
    } else if (req.params.actionType === 'winding') {
      actions = await Search_ActionsWorkflows.windingByReferencedComponent(req.params.uuid);
    }

    // Return the list in JSON format
    return res.json(actions);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


module.exports = router;
