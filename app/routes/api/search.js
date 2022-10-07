const router = require('express').Router();

const logger = require('../../lib/logger');
const Search = require('../../lib/Search');
const utils = require('../../lib/utils');


/// Search for geometry boards that have been received at a specified location
router.get('/search/geoBoardsByLocation/:location', async function (req, res, next) {
  try {
    // Retrieve a list of geometry boards, grouped by part number, that have been received at the specified location
    const boardsByPartNumber = await Search.boardsByLocation(req.params.location);

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
    const boardsByLocation = await Search.boardsByPartNumber(req.params.partNumber);

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
    // Retrieve a list of geometry boards, grouped by part number, that have the specified visual inspection disposition
    const boardsByLocation = await Search.boardsByVisualInspection(req.params.disposition);

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
    const boardsByDisposition = await Search.boardsByOrderNumber(req.params.orderNumber);

    // Return the list in JSON format
    return res.json(boardsByDisposition);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Search for workflows that involve a particular component, specified by its UUID
router.get('/search/workflowsByUUID/' + utils.uuid_regex, async function (req, res, next) {
  try {
    // Retrieve a list of workflows that involve the component corresponding to the specified UUID
    const workflows = await Search.workflowsByUUID(req.params.uuid);

    // Return the list in JSON format
    return res.json(workflows);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Search for an assembled APA using various details from its record
router.get('/search/apaByRecordDetails/:apaLocation/:apaConfiguration/:apaLocationNumber', async function (req, res, next) {
  try {
    // Retrieve a list of assembled APAs that match the specified record details
    const assembledAPAs = await Search.apasByRecordDetails(req.params.apaLocation, req.params.apaConfiguration, req.params.apaLocationNumber);

    // Return the list in JSON format
    return res.json(assembledAPAs);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


module.exports = router;
