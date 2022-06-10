'use strict';

const Forms = require('lib/Forms.js');
const logger = require('../lib/logger');
const router = require('express').Router();

module.exports = router;


/// List the type form tags which are associated with specific entity type forms
router.get('/tags', async function (req, res, next) {
  try {
    // Retrieve a list of all type form tags that are currently cached
    // Simultaneously, retrieve lists of all component and action type forms that currently exist in the respective collections    
    let [typeFormTags, componentTypeForms, actionTypeForms] = await Promise.all([
      Forms.tags(),
      Forms.list('componentForms'),
      Forms.list('actionForms')
    ]);

    // Render the interface page for listing the tags which are associated with specific entity type forms
    // The 'filtering' of the entity type forms with respect to individual tags is performed on the interface page itself
    res.render('tags.pug', {
      typeFormTags,
      componentTypeForms,
      actionTypeForms
    });
  } catch (err) {
    logger.error(err);
    res.status(400).send(err.toString());
  }
});
