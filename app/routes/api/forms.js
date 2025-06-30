const router = require('express').Router();

const Forms = require('../../lib/Forms');
const logger = require('../../lib/logger');
const permissions = require('../../lib/permissions');


/// List all type forms in a specified type form collection
router.get('/:collection/:format', async function (req, res, next) {
  try {
    // Retrieve a set of all type forms that currently exist in the specified collection
    // This returns an object containing a [key, form] pair for each type form, wnere the type form's ID is its own key
    const typeFormsObj = await Forms.list(req.params.collection);

    // If the response of this route is required as an actual list, generate and return it (in JSON format) from the object contents
    // Otherwise, return the original object in JSON format
    if (req.params.format == 'list') {
      let typeFormsArray = [];

      for (const key in typeFormsObj) typeFormsArray.push(typeFormsObj[key]);

      return res.status(201).json(typeFormsArray);
    } else {
      return res.status(201).json(typeFormsObj);
    }
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Retrieve a single type form from a specified type form collection
router.get('/:collection/singleType/:typeFormId', async function (req, res, next) {
  try {
    // Retrieve the type form corresponding to the specified type form ID
    const typeForm = await Forms.retrieve(req.params.collection, req.params.typeFormId);

    // Throw an error if there is no type form corresponding to the type form ID, and immediately return from this route
    if (!typeForm) {
      res.status(404).json({ error: `There is no type form with form ID = ${req.params.typeFormId} in the ${req.params.collection} collection` });
      return next();
    }

    // Return the type form in JSON format
    return res.status(201).json(typeForm);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Save a new or edit type form into the specified type form collection
router.post('/:collection/singleType/:typeFormId', permissions.checkPermissionJson('forms:edit'), async function (req, res, next) {
  try {
    // Display a logger message indicating that a record is being saved via the '/typeForm' route
    logger.info(req.body, `Submission to /${req.params.collection}/singleType/${req.params.typeFormId}`);

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
