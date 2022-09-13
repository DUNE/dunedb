const router = require('express').Router();

const Actions = require('lib/Actions.js');
const Components = require('lib/Components.js');
const Forms = require('lib/Forms.js');
const logger = require('../lib/logger');
const permissions = require('lib/permissions.js');
const utils = require('lib/utils.js');


/// View a single action record
router.get('/action/:actionId([A-Fa-f0-9]{24})', permissions.checkPermission('actions:view'), async function (req, res, next) {
  try {
    // Set up a query object consisting of the specified action ID and a version number if one is provided (if not, the most recent version is assumed)
    let query = { actionId: req.params.actionId };

    if (req.query.version) query['validity.version'] = parseInt(req.query.version, 10);

    // Simultaneously retrieve the specified version and all versions of the record, and throw an error if there is no record corresponding to the action ID
    const [action, actionVersions] = await Promise.all([
      Actions.retrieve(query),
      Actions.versions(req.params.actionId),
    ]);

    if (!action) return res.status(404).render(`There is no action record with action ID = ${req.params.actionId}`);

    // Retrieve the action type form corresponding to the type form ID in the action record, and throw an error if there is no such type form
    const actionTypeForm = await Forms.retrieve('actionForms', action.typeFormId);

    if (!actionTypeForm) return res.status(404).send(`There is no action type form with form ID = ${action.typeFormId}`);

    // Retrieve the record of the component that the action was performed on, using its component UUID (also found in the action record)
    const component = await Components.retrieve(action.componentUuid);

    // Render the interface page
    res.render('action.pug', {
      action,
      actionVersions,
      actionTypeForm,
      component,
    });
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// Perform a new action on an unspecified component
router.get('/action/:typeFormId/unspec', permissions.checkPermission('actions:perform'), async function (req, res, next) {
  try {
    // Retrieve the action type form corresponding to the specified type form ID, and throw an error if there is no such type form
    const actionTypeForm = await Forms.retrieve('actionForms', req.params.typeFormId);

    if (!actionTypeForm) return res.status(404).send(`There is no action type form with form ID = ${req.params.typeFormId}`);

    // Render the interface page
    res.render('action_unspecComponent.pug', {
      actionTypeFormId: req.params.typeFormId,
      actionTypeFormName: actionTypeForm.formName,
    });
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// Perform a new action on a specified component
router.get('/action/:typeFormId/' + utils.uuid_regex, permissions.checkPermission('actions:perform'), async function (req, res, next) {
  try {
    // Retrieve the action type form corresponding to the specified type form ID, and throw an error if there is no such type form
    const actionTypeForm = await Forms.retrieve('actionForms', req.params.typeFormId);

    if (!actionTypeForm) return res.status(404).send(`There is no action type form with form ID = ${req.params.typeFormId}`);

    // Set the workflow ID if one is provided
    let workflowId = '';

    if (req.query.workflowId) workflowId = req.query.workflowId;

    // Render the interface page
    res.render('action_specComponent.pug', {
      actionTypeForm,
      componentUuid: req.params.uuid,
      workflowId,
    });
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// Edit an existing action
router.get('/action/:actionId([A-Fa-f0-9]{24})/edit', permissions.checkPermission('actions:perform'), async function (req, res, next) {
  try {
    // Retrieve the most recent version of the record corresponding to the specified action ID, and throw an error if there is no such record
    const action = await Actions.retrieve(req.params.actionId);

    if (!action) return res.status(404).render(`There is no action record with action ID = ${req.params.actionId}`);

    // Retrieve the action type form corresponding to the type form ID in the action record, and throw an error if there is no such type form
    const actionTypeForm = await Forms.retrieve('actionForms', action.typeFormId);

    if (!actionTypeForm) return res.status(404).send(`There is no action type form with form ID = ${action.typeFormId}`);

    // Render the interface page
    res.render('action_specComponent.pug', {
      action,
      actionTypeForm,
      componentUuid: action.componentUuid,
      workflowId: '',
    });
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// Create a new action type form
router.get('/actionTypes/:typeFormId/new', permissions.checkPermission('forms:edit'), async function (req, res) {
  try {
    // Check that the specified type form ID is not already being used - attempt to retrieve any and all existing action type forms with this type form ID
    let typeForm = await Forms.retrieve('actionForms', req.params.typeFormId);

    // If there are no existing type forms, set up a new one using the specified type form ID and an initially empty form schema, and save it into the 'actionForms' collection
    // Use the form ID as the form name to start with - the user will have the option of changing the name later via the interface
    if (!typeForm) {
      typeForm = {
        formId: req.params.typeFormId,
        formName: req.params.typeFormId,
        schema: { components: [] },
      };

      Forms.save(typeForm, 'actionForms', req);
    }

    // Redirect the user to the interface page for editing an existing action type form
    res.redirect(`/actionTypes/${req.params.typeFormId}/edit`);
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// Edit an existing action type form
router.get('/actionTypes/:typeFormId/edit', permissions.checkPermission('forms:edit'), async function (req, res) {
  try {
    // Render the interface page
    res.render('action_editTypeForm.pug', {
      collection: 'actionForms',
      formId: req.params.typeFormId,
    });
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// List all action types
router.get('/actionTypes/list', permissions.checkPermission('actions:view'), async function (req, res, next) {
  try {
    // Retrieve a list of all action type forms that currently exist in the 'actionForms' collection
    const actionTypeForms = await Forms.list('actionForms');

    // Render the interface page
    res.render('action_listTypes.pug', { actionTypeForms });
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// List all actions across all action types
router.get('/actions/list', permissions.checkPermission('actions:view'), async function (req, res, next) {
  try {
    // Retrieve records of all actions across all action types
    // The first argument should be 'null' in order to match to any type form ID
    const actions = await Actions.list(null, { limit: 100 });

    // Retrieve a list of all action type forms that currently exist in the 'actionForms' collection
    const allActionTypeForms = await Forms.list('actionForms');

    // Render the interface page
    res.render('action_list.pug', {
      actions,
      singleType: false,
      title: 'All Performed Actions (All Types)',
      allActionTypeForms,
    });
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// List all actions of a single action type
router.get('/actions/:typeFormId/list', permissions.checkPermission('actions:view'), async function (req, res, next) {
  try {
    // Retrieve records of all actions with the specified action type
    // The first argument should be an object consisting of the match condition, i.e. the type form ID to match to
    const actions = await Actions.list({ typeFormId: req.params.typeFormId }, { limit: 100 });

    // Retrieve the action type form corresponding to the specified type form ID
    const actionTypeForm = await Forms.retrieve('actionForms', req.params.typeFormId);

    // Retrieve a list of all action type forms that currently exist in the 'actionForms' collection
    const allActionTypeForms = await Forms.list('actionForms');

    // Render the interface page
    res.render('action_list.pug', {
      actions,
      singleType: true,
      title: 'All Performed Actions (Single Type)',
      actionTypeForm,
      allActionTypeForms,
    });
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


module.exports = router;
