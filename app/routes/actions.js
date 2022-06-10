'use strict';

const Actions = require('lib/Actions.js');
const Components = require('lib/Components.js')('component');
const Forms = require('lib/Forms.js');
const logger = require('../lib/logger');
const permissions = require('lib/permissions.js');
const router = require('express').Router();
const utils = require('lib/utils.js');

var default_form_schema = JSON.parse(require('fs').readFileSync('./schemas/default_form_schema.json'));

module.exports = router;


/// View a single action record
router.get('/action/:actionId([A-Fa-f0-9]{24})', permissions.checkPermission('actions:view'), async function (req, res, next) {
  try {
    // Set up a database query that includes the specified action ID and a version number if also provided
    var query = { actionId: req.params.actionId };

    if (req.query.version) {
      query['validity.version'] = parseInt(req.query.version);
    }

    // Retrieve the specified version of the record using the query
    // Simultaneously, retrieve ALL versions of the same record
    let [action, actionVersions] = await Promise.all([
      Actions.retrieve(query),
      Actions.versions(req.params.actionId)
    ]);

    // Throw an error if there is no record corresponding to the query
    if (!action) {
      return res.status(400).render("There is no action record with action ID = " + req.params.actionId);
    }

    // Retrieve the action type form, using its type form ID (which is specified in the record)
    var actionTypeForm = await Forms.retrieve('actionForms', action.typeFormId);

    // Throw an error if there is no type form corresponding to the type form ID
    if (!actionTypeForm) {
      return res.status(400).send("There is no action type form with form ID = " + action.typeFormId);
    }

    // Get the record of the component that the action was performed on, using its component UUID (also specified in the record)
    var component = await Components.retrieve(action.componentUuid);

    // Render the interface page for viewing an action record
    res.render('action.pug', {
      action,
      actionVersions,
      actionTypeForm,
      component
    });
  } catch (err) {
    logger.error(err);
    res.status(400).send(err.toString());
  }
});


/// Perform a new action on an unspecified component
router.get('/action/:typeFormId', permissions.checkPermission('actions:perform'), async function (req, res, next) {
  try {
    // Retrieve the action type form corresponding to the specified type form ID
    var actionTypeForm = await Forms.retrieve('actionForms', req.params.typeFormId);

    // Throw an error if there is no type form corresponding to the type form ID
    if (!actionTypeForm) {
      return res.status(400).send("There is no action type form with form ID = " + req.params.typeFormId);
    }

    // Render the interface page for performing an action on an unspecified component
    // This (eventually) redirects to the page for performing an action on a specified component, but first allows the component UUID to be set
    res.render('action_unspecComponent.pug', {
      actionTypeFormId: req.params.typeFormId,
      actionTypeFormName: actionTypeForm.formName
    });
  } catch (err) {
    logger.error(err);
    res.status(400).send(err.toString());
  }
});


/// Perform a new action on a specified component
router.get('/action/:typeFormId/' + utils.uuid_regex, permissions.checkPermission('actions:perform'), async function (req, res, next) {
  try {
    // Retrieve the action type form corresponding to the specified type form ID
    var actionTypeForm = await Forms.retrieve('actionForms', req.params.typeFormId);

    // Throw an error if there is no type form corresponding to the type form ID
    if (!actionTypeForm) {
      return res.status(400).send("There is no action type form with form ID = " + req.params.typeFormId);
    }

    // Render the interface page for performing an action on a specified component
    res.render('action_specComponent.pug', {
      actionTypeForm,
      componentUuid: req.params.uuid
    });
  } catch (err) {
    logger.error(err);
    res.status(400).send(err.toString());
  }
});


/// Edit an existing action that has been performed on a specified component
router.get('/action/:actionId([A-Fa-f0-9]{24})/edit', permissions.checkPermission('actions:perform'), async function (req, res, next) {
  try {
    // Retrieve the most recent version of the record corresponding to the specified action ID
    var action = await Actions.retrieve(req.params.actionId);

    // Throw an error if there is no record corresponding to the action ID
    if (!action) {
      return res.status(400).render("There is no action record with action ID = " + req.params.actionId);
    }

    // Retrieve the action type form, using its type form ID (which is specified in the record)
    var actionTypeForm = await Forms.retrieve('actionForms', action.typeFormId);

    // Throw an error if there is no type form corresponding to the type form ID
    if (!actionTypeForm) {
      return res.status(400).send("There is no action type form with form ID = " + action.typeFormId);
    }

    // Render the interface page for performing an action on a specified component
    // Editing the action is effectively the same as 're-performing' it on the same component, so we can use the same interface page
    res.render('action_specComponent.pug', {
      action,
      actionTypeForm,
      componentUuid: action.componentUuid
    });
  } catch (err) {
    logger.error(err);
    res.status(400).send(err.toString());
  }
});


// Create a new action type form
router.get('/actionTypes/:typeFormId/new', permissions.checkPermission('forms:edit'), async function (req, res) {
  try {
    // Check that the specified type form ID is not already being used
    // Attempt to retrieve any and all existing type forms with this type form ID
    var typeForm = await Forms.retrieve('actionForms', req.params.typeFormId);

    // If there are no existing type forms, set up a new one using the specified type form ID and the default form schema
    // Then save the new type form into the 'actionForms' collection of records
    // Initially, use the form ID as the form name as well - the user will have the option of changing the name later
    if (!typeForm) {
      var typeForm = {
        formId: req.params.typeFormId,
        formName: req.params.typeFormId,
        schema: default_form_schema
      };

      Forms.save(typeForm, 'actionForms', req);
    }

    // Redirect the user to the interface page for editing an existing action type form
    res.redirect('/actionTypes/' + req.params.typeFormId + '/edit');
  } catch (err) {
    logger.error(err);
    res.status(400).send(err.toString());
  }
});


// Edit an existing action type form
router.get('/actionTypes/:typeFormId/edit', permissions.checkPermission('forms:edit'), async function (req, res) {
  try {
    // Render the interface page for editing an existing action type form
    res.render('action_editTypeForm.pug', {
      collection: 'actionForms',
      formId: req.params.typeFormId
    });
  } catch (err) {
    logger.error(err);
    res.status(400).send(err.toString());
  }
});


// List all action types
router.get('/actionTypes/list', permissions.checkPermission('actions:view'), async function (req, res, next) {
  try {
    // Retrieve a list of all action type forms that currently exist in the 'actionForms' collection
    var actionTypeForms = await Forms.list('actionForms');

    // Render the interface page for listing all action types
    res.render('action_listTypes.pug', { actionTypeForms });
  } catch (err) {
    logger.error(err);
    res.status(400).send(err.toString());
  }
});


// List all actions performed across all action types
router.get('/actions/list', permissions.checkPermission('actions:view'), async function (req, res, next) {
  try {
    // Retrieve records of all performed actions across all action types
    // The first argument ('match_condition') should be 'null' in order to match to any record
    var actions = await Actions.list(null, { limit: 100 });

    // Retrieve a list of all action type forms that currently exist in the 'actionForms' collection
    var allActionTypeForms = await Forms.list('actionForms');

    // Render the interface page for showing a generic list of actions
    res.render('action_list.pug', {
      actions,
      singleType: false,
      title: 'All Performed Actions (All Types)',
      allActionTypeForms
    });
  } catch (err) {
    logger.error(err);
    res.status(400).send(err.toString());
  }
});


// List all actions of a single action type
router.get('/actions/:typeFormId/list', permissions.checkPermission('actions:view'), async function (req, res, next) {
  try {
    // Construct the 'match_condition' to be used for querying the database
    // For this route, it is that a record's action type form ID must match the specified one
    var match_condition = { typeFormId: req.params.typeFormId };

    // Retrieve a list of records that match the specified condition
    var actions = await Actions.list(match_condition, { limit: 100 });

    // Retrieve the action type form corresponding to the specified type form ID
    var actionTypeForm = await Forms.retrieve('actionForms', req.params.typeFormId);

    // Retrieve a list of all action type forms that currently exist in the 'actionForms' collection
    var allActionTypeForms = await Forms.list('actionForms');

    // Render the interface page for showing a generic list of actions
    res.render('action_list.pug', {
      actions,
      singleType: true,
      title: 'All Actions (Single Type)',
      actionTypeForm,
      allActionTypeForms
    });
  } catch (err) {
    logger.error(err);
    res.status(400).send(err.toString());
  }
});
