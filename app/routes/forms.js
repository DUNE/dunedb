const router = require('express').Router();

const Forms = require('../lib/Forms');
const logger = require('../lib/logger');
const permissions = require('../lib/permissions');


/// Retrieve all type forms in the specified collection
router.get(['/json/collection/:collection/:format', '/api/collection/:collection/:format'], async function (req, res, next) {
  try {
    // Retrieve an object containing all type forms that currently exist in the specified collection
    // The object contains a [key, sub-object] pair for each type form, wnere the type form's ID is its own key and the sub-object contains some basic information about the type form
    const typeFormsObj = await Forms.list(req.params.collection);

    // If the response of this route is required as a list, generate and return it (in JSON format) from the object contents
    // Otherwise, return the original object in JSON format
    if (req.params.format == 'list') {
      let typeFormsArray = [];

      for (const key in typeFormsObj) typeFormsArray.push(typeFormsObj[key]);

      return res.status(200).json(typeFormsArray);
    } else {
      return res.status(200).json(typeFormsObj);
    }
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Retrieve an existing type form record from the specified collection via its type form ID
router.get(['/json/collection/:collection/singleType/:typeFormId', '/api/collection/:collection/singleType/:typeFormId'], async function (req, res, next) {
  try {
    // Retrieve the record
    // If there is no record corresponding to the type form and collection, this returns 'null'
    const typeForm = await Forms.retrieve(req.params.collection, req.params.typeFormId);

    // Return the record in JSON format
    return res.status(200).json(typeForm);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Create a new type form or edit an existing type form record in the specified collection
router.post(['/json/collection/:collection/singleType/:typeFormId/edit', '/api/collection/:collection/singleType/:typeFormId/edit'], permissions.checkPermissionJson('forms:edit'), async function (req, res, next) {
  try {
    // Display a logger message indicating that a record is being saved via the '/:collection/singleType/:typeFormId/edit' route
    logger.info(req.body, `Submission to /json/${req.params.collection}/singleType/${req.params.typeFormId}/edit`);

    // Save the record ... if successful, this returns the type form ID
    const typeFormId = await Forms.save(req.body, req.params.collection, req);

    // Return the record's type form ID
    return res.status(201).json(typeFormId);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


module.exports = router;
