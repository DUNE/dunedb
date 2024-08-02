const router = require('express').Router();

const utils = require('../lib/utils');


/// View descriptions of the available search pages
router.get('/search', async function (req, res, next) {
  // Render the interface page
  res.render('search.pug');
});


/// Search for components by UUID, or of a specified type and type record number
router.get('/search/componentsByUUIDOrTypeAndNumber', async function (req, res, next) {
  // Render the interface page
  res.render('search_componentsByUUIDOrTypeAndNumber.pug');
});


/// Search for geometry boards that have been received at a specific location, or are of a specified part number
router.get('/search/geoBoardsByLocationOrPartNumber', async function (req, res, next) {
  // Render the interface page
  res.render('search_geoBoardsByLocationOrPartNumber.pug', { dictionary_locations: utils.dictionary_locations });
});


/// Search for geometry boards that have a specified visual inspection disposition, or have a specified order number
router.get('/search/geoBoardsByVisInspectOrOrderNumber', async function (req, res, next) {
  // Render the interface page
  res.render('search_geoBoardsByVisInspectOrOrderNumber.pug');
});


/// Search for geometry board shipments using various shipment reception details
router.get('/search/boardShipmentsByReceptionDetails', async function (req, res, next) {
  // Render the interface page
  res.render('search_boardShipmentsByReceptionDetails.pug', { dictionary_locations: utils.dictionary_locations });
});


/// Search for grounding mesh panels that have been received at a specific location, or are of a specified part number
router.get('/search/meshesByLocationOrPartNumber', async function (req, res, next) {
  // Render the interface page
  res.render('search_meshesByLocationOrPartNumber.pug', { dictionary_locations: utils.dictionary_locations });
});


/// Search for populated board kit components that have been received at a specific location
router.get('/search/boardKitComponentsByLocation', async function (req, res, next) {
  // Render the interface page
  res.render('search_boardKitComponentsByLocation.pug', { dictionary_locations: utils.dictionary_locations });
});


/// Search for an assembled APA using its production location and number
router.get('/search/apaByProductionDetails', async function (req, res, next) {
  // Render the interface page
  res.render('search_apaByProductionDetails.pug', { dictionary_locations: utils.dictionary_locations });
});


/// Search for actions by ID, or of a specified type that references a specified component UUID
router.get('/search/actionsByIDOrReferencedUUID', async function (req, res, next) {
  // Render the interface page
  res.render('search_actionsByIDOrReferencedUUID.pug');
});


/// Search for non-conformance actions performed on a specified component type, or on a single component, specified by its UUID
router.get('/search/nonConformanceByComponentTypeOrUUID', async function (req, res, next) {
  // Render the interface page
  res.render('search_nonConformanceByComponentTypeOrUUID.pug');
});


/// Search for workflows by ID, or that involve a particular component specified by its UUID
router.get('/search/workflowsByIDOrUUID', async function (req, res, next) {
  // Render the interface page
  res.render('search_workflowsByIDOrUUID.pug');
});


module.exports = router;
