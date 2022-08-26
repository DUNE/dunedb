const router = require('express').Router();

const logger = require('../../lib/logger');
const Search = require('lib/Search.js');


router.get('/search/byLocation/:location', async function (req, res, next) {
  try {
    // Retrieve a list of geometry boards, grouped by part number, that have been received at the specified location
    const boardsByPartNumber = await Search.listBoardsByLocation(req.params.location);

    // Return the list in JSON format
    return res.json(boardsByPartNumber);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


router.get('/search/byPartNumber/:partNumber', async function (req, res, next) {
  try {
    // Retrieve a list of geometry boards, grouped by reception location, of the specified part number that have been received at any location
    const boardsByLocation = await Search.listBoardsByPartNumber(req.params.partNumber);

    // Return the list in JSON format
    return res.json(boardsByLocation);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


router.get('/search/byVisualInspection/:disposition', async function (req, res, next) {
  try {
    // Retrieve a list of geometry boards, grouped by part number, that have the specified visual inspection disposition
    const boardsByLocation = await Search.listBoardsByVisualInspection(req.params.disposition);

    // Return the list in JSON format
    return res.json(boardsByLocation);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


module.exports = router;
