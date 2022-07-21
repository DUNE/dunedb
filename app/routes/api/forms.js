const router = require('express').Router();

const Forms = require("lib/Forms.js");
const logger = require('../../lib/logger');


/// List all type forms in a specified type form collection
router.get('/:collection(componentForms|actionForms|workflowForms)/:format(list|object)?', async function (req, res, next) {
  try {
    // Retrieve a list of all type forms that currently exist in the specified collection
    const typeFormsObj = await Forms.list(req.params.collection);

    // If the list is required as an actual list, generate and return it from the list contents, in JSON format
    if (req.params.format == 'list') {
      let typeFormsArray = [];

      for (const key in typeFormsObj) typeFormsArray.push(typeFormsObj[key]);

      return res.json(typeFormsArray);
    }

    // Otherwise, return the raw type forms object in JSON format
    return res.json(typeFormsObj);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Retrieve a single type form from a specified type form collection
router.get('/:collection(componentForms|actionForms|workflowForms)/:typeFormId', async function (req, res, next) {
  try {
    // Retrieve the type form corresponding to the specified type form ID
    const typeForm = await Forms.retrieve(req.params.collection, req.params.typeFormId);

    // Throw an error if there is no type form corresponding to the type form ID
    if (!typeForm) {
      res.status(404).json({ error: `There is no type form with form ID = ${req.params.typeFormId} in the ${req.params.collection} collection` });
      return next();
    }

    // Return the type form in JSON format
    return res.json(typeForm);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Save a new or edit type form into the specified type form collection
router.post('/:collection(componentForms|actionForms|workflowForms)/:typeFormId', async function (req, res, next) {
  try {
    // Display a logger message indicating that a record is being saved via the '/typeForm' route
    logger.info(req.body, 'Submission to /typeForm');

    // Save the record
    const typeForm = await Forms.save(req.body, req.params.collection, req);
    res.json(typeForm);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


module.exports = router;
