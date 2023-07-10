const router = require('express').Router();

const logger = require('../../lib/logger');
const Search_GeoBoards = require('../../lib/Search_GeoBoards');
const Search_Other = require('../../lib/Search_Other');
const utils = require('../../lib/utils');


/// Search for geometry boards that have been received at a specified location
router.get('/search/geoBoardsByLocation/:location', async function (req, res, next) {
  try {
    // Retrieve a list of geometry boards, grouped by part number, that have been received at the specified location
    const boardsByPartNumber = await Search_GeoBoards.boardsByLocation(req.params.location);

    // Return the list in JSON format
    return res.json(boardsByPartNumber);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Search for geometry boards of a specified part number
router.get('/search/geoBoardsByPartNumber/:partNumber', async function (req, res, next) {
  try {
    // Retrieve a list of geometry boards, grouped by reception location, of the specified part number
    const boardsByLocation = await Search_GeoBoards.boardsByPartNumber(req.params.partNumber);

    // Return the list in JSON format
    return res.json(boardsByLocation);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Search for geometry boards that have a specified visual inspection disposition
router.get('/search/geoBoardsByVisualInspection/:disposition', async function (req, res, next) {
  try {
    // This search query can have an optional query string for a specific inspection issue
    // Parse out the string if it has been provided (as a non-empty string), or otherwise set it to 'null'
    const issue = (req.query.issue !== '') ? req.query.issue : null;

    // Retrieve a list of geometry boards, grouped by part number, that have the specified visual inspection disposition and optional issue
    const boardsByLocation = await Search_GeoBoards.boardsByVisualInspection(req.params.disposition, issue);

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
    const shipments = await Search_Other.boardShipmentsByReceptionDetails(status, origin, destination, earliest, latest, comment);

    // Return the list in JSON format
    return res.json(shipments);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Search for workflows that involve a particular component, specified by its UUID
router.get('/search/workflowsByUUID/' + utils.uuid_regex, async function (req, res, next) {
  try {
    // Retrieve a list of workflows that involve the component corresponding to the specified UUID
    const workflows = await Search_Other.workflowsByUUID(req.params.uuid);

    // Return the list in JSON format
    return res.json(workflows);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Search for an assembled APA using various details from its record
router.get('/search/apaByRecordDetails/:apaLocation/:apaLocationNumber', async function (req, res, next) {
  try {
    // Retrieve a list of assembled APAs that match the specified record details
    const assembledAPAs = await Search_Other.apasByRecordDetails(req.params.apaLocation, req.params.apaLocationNumber);

    // Return the list in JSON format
    return res.json(assembledAPAs);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Search for non-conformance actions performed on a specified component type
router.get('/search/nonConformanceByComponentType', async function (req, res, next) {
  try {
    // This search query can have multiple query strings, some of which are optional
    // So first, parse out the strings which have actually been provided (as non-empty strings), and set the rest to 'null'
    // The only required query string is the 'component type', which will always have a valid value provided
    const componentType = req.query.componentType;
    const disposition = (req.query.disposition !== '') ? req.query.disposition : null;
    const status = (req.query.status !== '') ? req.query.status : null;

    // Retrieve a list of non-conformance actions that match the specified non-conformance details
    const actions = await Search_Other.nonConformanceByComponentType(componentType, disposition, status);

    // Return the list in JSON format
    return res.json(actions);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Search for non-conformance actions performed on a single component, specified by its UUID
router.get('/search/nonConformanceByComponentUUID/' + utils.uuid_regex, async function (req, res, next) {
  try {
    // Retrieve a list of non-conformance actions that have been performed on the component corresponding to the specified UUID
    const actions = await Search_Other.nonConformanceByComponentUUID(req.params.uuid);

    // Return the list in JSON format
    return res.json(actions);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


module.exports = router;
