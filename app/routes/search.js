const router = require('express').Router();


/// View descriptions of the available search pages
router.get('/search', async function (req, res, next) {
  // Render the interface page
  res.render('search.pug');
});


/// Search for a record using its UUID (components) or ID (actions or workflows)
router.get('/search/recordByUUIDOrID', async function (req, res, next) {
  // Render the interface page
  res.render('search_recordByUUIDOrID.pug');
});


/// Search for geometry boards that have been received at a specific location, or are of a specified part number
router.get('/search/geoBoardsByLocationOrPartNumber', async function (req, res, next) {
  // Render the interface page
  res.render('search_geoBoardsByLocationOrPartNumber.pug');
});


/// Search for geometry boards that have a specified visual inspection disposition, or have a specified order number
router.get('/search/geoBoardsByVisInspectOrOrderNumber', async function (req, res, next) {
  // Render the interface page
  res.render('search_geoBoardsByVisInspectOrOrderNumber.pug');
});


module.exports = router;
