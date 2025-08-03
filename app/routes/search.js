const router = require('express').Router();

const logger = require('../lib/logger');
const Search_ActionsWorkflows = require('../lib/Search_ActionsWorkflows');
const Search_GeoBoards = require('../lib/Search_GeoBoards');
const Search_OtherComponents = require('../lib/Search_OtherComponents');
const utils = require('../lib/utils');


/// Search for components by UUID, DUNE PID, or type and type record number (client-side interface)
router.get('/search/componentsByIdentifier', async function (req, res, next) {
  // Render the interface page
  res.render('search_componentsByIdentifier.pug');
});


/// Search for components by DUNE PID (query to server-side)
router.get(['/json/search/componentsByDUNEPID/:dunePID', '/api/search/componentsByDUNEPID/:dunePID'], async function (req, res, next) {
  try {
    // Retrieve a list of components that match the specified record details
    const components = await Search_OtherComponents.componentsByDUNEPID(req.params.dunePID);

    // Return the list in JSON format
    return res.status(200).json(components);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Search for components by type and type record number (query to server-side)
router.get(['/json/search/componentsByTypeAndNumber/:typeFormId/:typeRecordNumber', '/api/search/componentsByTypeAndNumber/:typeFormId/:typeRecordNumber'], async function (req, res, next) {
  try {
    // Retrieve a list of components that match the specified record details
    const components = await Search_OtherComponents.componentsByTypeAndNumber(req.params.typeFormId, req.params.typeRecordNumber);

    // Return the list in JSON format
    return res.status(200).json(components);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Search for components by type and current location (client-side interface)
router.get('/search/componentsByTypeAndLocation', async function (req, res, next) {
  // Render the interface page
  res.render('search_componentsByTypeAndLocation.pug', { dictionary_locations: utils.dictionary_locations });
});


/// Search for components by type and current location (query to server-side)
router.get(['/json/search/componentsByTypeAndLocation/:typeFormId/:location/:acceptanceStatus/:toothStripStatus/:conformanceStatus/:qaChecksStatus', '/api/search/componentsByTypeAndLocation/:typeFormId/:location/:acceptanceStatus/:toothStripStatus/:conformanceStatus/:qaChecksStatus'], async function (req, res, next) {
  try {
    // Retrieve a list of components that match the specified record details
    // Geometry boards and grounding mesh panels are grouped by part number, other component types are ungrouped
    const components = await Search_OtherComponents.componentsByTypeAndLocation(req.params.typeFormId, req.params.location, req.params.acceptanceStatus, req.params.toothStripStatus, req.params.conformanceStatus, req.params.qaChecksStatus);

    // Return the list in JSON format
    return res.status(200).json(components);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Search for components by type and part number (client-side interface)
router.get('/search/componentsByTypeAndPartNumber', async function (req, res, next) {
  // Render the interface page
  res.render('search_componentsByTypeAndPartNumber.pug', { dictionary_locations: utils.dictionary_locations });
});


/// Search for components by type and part number (query to server-side)
router.get(['/json/search/componentsByTypeAndPartNumber/:typeFormId/:partNumber/:acceptanceStatus/:toothStripStatus', '/api/search/componentsByTypeAndPartNumber/:typeFormId/:partNumber/:acceptanceStatus/:toothStripStatus'], async function (req, res, next) {
  try {
    // Retrieve a list of components that match the specified record details
    // Geometry boards and grounding mesh panels are grouped by location, other component types are ungrouped
    const components = await Search_OtherComponents.componentsByTypeAndPartNumber(req.params.typeFormId, req.params.partNumber, req.params.acceptanceStatus, req.params.toothStripStatus);

    // Return the list in JSON format
    return res.status(200).json(components);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Search for geometry boards that have a specified visual inspection disposition, or have a specified order number (client-side interface)
router.get('/search/geoBoardsByVisInspectOrOrderNumber', async function (req, res, next) {
  // Render the interface page
  res.render('search_geoBoardsByVisInspectOrOrderNumber.pug');
});


/// Search for geometry boards that have a specified visual inspection disposition (query to server-side)
router.get(['/json/search/geoBoardsByVisualInspection/:disposition/:issue', '/api/search/geoBoardsByVisualInspection/:disposition/:issue'], async function (req, res, next) {
  try {
    // Retrieve a list of geometry boards, grouped by part number, that have the specified visual inspection disposition
    const boardsByPartNumber = await Search_GeoBoards.boardsByVisualInspection(req.params.disposition, req.params.issue);

    // Return the list in JSON format
    return res.status(200).json(boardsByPartNumber);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Search for geometry boards that came from a batch with a specified order number (query to server-side)
router.get(['/json/search/geoBoardsByOrderNumber/:orderNumber', '/api/search/geoBoardsByOrderNumber/:orderNumber'], async function (req, res, next) {
  try {
    // Retrieve a list of geometry boards, grouped by visual inspection disposition, that came from a batch with the specified order number
    const boardsByDisposition = await Search_GeoBoards.boardsByOrderNumber(req.params.orderNumber);

    // Return the list in JSON format
    return res.status(200).json(boardsByDisposition);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Search for geometry board shipments using various shipment reception details (client-side interface)
router.get('/search/boardShipmentsByReceptionDetails', async function (req, res, next) {
  // Render the interface page
  res.render('search_boardShipmentsByReceptionDetails.pug', { dictionary_locations: utils.dictionary_locations });
});


/// Search for geometry board shipments using various shipment reception details (query to server-side)
router.get(['/json/search/boardShipmentsByReceptionDetails', '/api/search/boardShipmentsByReceptionDetails'], async function (req, res, next) {
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
    return res.status(200).json(shipments);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Search for assembled APAs by production details - either location and number, or last completed assembly step (client-side interface)
router.get('/search/apasByProductionDetails', async function (req, res, next) {
  // Render the interface page
  res.render('search_apasByProductionDetails.pug', { dictionary_locations: utils.dictionary_locations });
});


/// Search for assembled APAs by production location and number (query to server-side)
router.get(['/json/search/apasByProductionLocationAndNumber/:apaLocation/:apaNumber', '/api/search/apasByProductionLocationAndNumber/:apaLocation/:apaNumber'], async function (req, res, next) {
  try {
    // Retrieve a list of assembled APAs that match the specified record details
    const assembledAPAs = await Search_OtherComponents.apasByProductionLocationAndNumber(req.params.apaLocation, req.params.apaNumber);

    // Return the list in JSON format
    return res.status(200).json(assembledAPAs);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Search for assembled APAs by production location and last completed assembly step (query to server-side)
router.get(['/json/search/apasByProductionLocationAndAssemblyStep/:apaLocation/:assemblyStep', '/api/search/apasByProductionLocationAndAssemblyStep/:apaLocation/:assemblyStep'], async function (req, res, next) {
  try {
    // Retrieve a nested list, consisting of:
    // - a list of all assembled APAs at the specified location that have been completed up to and including the specified step in their assembly workflows
    // - a list of all assembled APAs at the specified location that have NOT yet reached the specified step in their assembly workflows
    const assembledAPAs = await Search_OtherComponents.apasByProductionLocationAndAssemblyStep(req.params.apaLocation, req.params.assemblyStep);

    // Return the list in JSON format
    return res.status(200).json(assembledAPAs);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Search for actions by ID, or of a specified type that references a specified component UUID (client-side interface)
router.get('/search/actionsByIDOrReferencedUUID', async function (req, res, next) {
  // Render the interface page
  res.render('search_actionsByIDOrReferencedUUID.pug');
});


/// Search for actions of a specified type that reference a specified component UUID (query to server-side)
router.get(['/json/search/actionsByReferencedUUID/:uuid/:actionType', '/api/search/actionsByReferencedUUID/:uuid/:actionType'], async function (req, res, next) {
  try {
    // Depending on the specified action type, retrieve a list of actions of the specified type that reference the specified component UUID
    let actions = null;

    if (req.params.actionType === 'boardInstall') {
      actions = await Search_ActionsWorkflows.boardInstallByReferencedComponent(req.params.uuid);
    } else if (req.params.actionType === 'winding') {
      actions = await Search_ActionsWorkflows.windingByReferencedComponent(req.params.uuid);
    }

    // Return the list in JSON format
    return res.status(200).json(actions);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Search for non-conformance actions performed on a specified component type, or on a single component, specified by its UUID (client-side interface)
router.get('/search/nonConformanceByComponentTypeOrUUID', async function (req, res, next) {
  // Render the interface page
  res.render('search_nonConformanceByComponentTypeOrUUID.pug');
});


/// Search for non-conformance actions performed on a specified component type (query to server-side)
router.get(['/json/search/nonConformanceByComponentType/:componentType/:disposition/:status', '/api/search/nonConformanceByComponentType/:componentType/:disposition/:status'], async function (req, res, next) {
  try {
    // Retrieve a list of non-conformance actions that match the specified non-conformance details
    const actions = await Search_ActionsWorkflows.nonConformanceByComponentType(req.params.componentType, req.params.disposition, req.params.status);

    // Return the list in JSON format
    return res.status(200).json(actions);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Search for non-conformance actions performed on a single component, specified by its UUID (query to server-side)
router.get(['/json/search/nonConformanceByUUID/:uuid', '/api/search/nonConformanceByUUID/:uuid'], async function (req, res, next) {
  try {
    // Retrieve a list of non-conformance actions that have been performed on the component corresponding to the specified UUID
    const actions = await Search_ActionsWorkflows.nonConformanceByUUID(req.params.uuid);

    // Return the list in JSON format
    return res.status(200).json(actions);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Search for workflows by ID, or that involve a particular component specified by its UUID (client-side interface)
router.get('/search/workflowsByIDOrUUID', async function (req, res, next) {
  // Render the interface page
  res.render('search_workflowsByIDOrUUID.pug');
});


/// Search for workflows that involve a particular component, specified by its UUID (query to server-side)
router.get(['/json/search/workflowsByUUID/:uuid', '/api/search/workflowsByUUID/:uuid'], async function (req, res, next) {
  try {
    // Retrieve a list of workflows that involve the component corresponding to the specified UUID
    const workflows = await Search_ActionsWorkflows.workflowsByUUID(req.params.uuid);

    // Return the list in JSON format
    return res.status(200).json(workflows);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


module.exports = router;
