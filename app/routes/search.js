const router = require('express').Router();

var permissions = require('lib/permissions.js');
const logger = require('../lib/logger');

router.get('/search/general/:recordType?/:formId?',permissions.checkPermission("components:view"),
 async function(req,res,next) {
    var recordType = req.params.recordType;
    var formId = req.params.formId?decodeURIComponent(req.params.formId):null;
    logger.info("/search ", recordType,formId)
    res.render("searchForm.pug",{recordType,formId});
});


/// Search for a record using its UUID (components) or ID (actions or workflows)
router.get('/search/byUUIDorID', async function (req, res, next) {
  // Render the interface page for searching for a record using its UUID or ID
  res.render('search_byUUIDorID.pug');
});


/// Search for geometry boards that either have been received at a specific location, or are of a specified part number
router.get('/search/byLocationOrPartNumber', async function (req, res, next) {
  // Render the interface page for searching for geometry boards by location or part number
  res.render('search_byLocationOrPartNumber.pug');
});


module.exports = router;
