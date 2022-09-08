const router = require('express').Router();

const Forms = require('lib/Forms.js');
const logger = require('../lib/logger');


/// View a table of which tags are associated with specific type forms
router.get('/tags', async function (req, res, next) {
  try {
    // Retrieve a list of all type form tags that exist across all type forms
    // Simultaneously, retrieve lists of all component, action and workflow type forms that currently exist in the respective collections    
    let [typeFormTags, componentTypeForms, actionTypeForms, workflowTypeForms] = await Promise.all([
      Forms.tags(),
      Forms.list('componentForms'),
      Forms.list('actionForms'),
      Forms.list('workflowForms'),
    ]);

    // Render the interface page ... note that the 'matching' of the type forms to their respective tags is performed on the interface page itself
    res.render('tags.pug', {
      typeFormTags,
      componentTypeForms,
      actionTypeForms,
      workflowTypeForms,
    });
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


module.exports = router;
