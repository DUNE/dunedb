const router = require('express').Router();

const Forms = require('lib/Forms.js');
const logger = require('../lib/logger');
const permissions = require('lib/permissions.js');
const Workflows = require('lib/Workflows.js');


/// View a single workflow record
router.get('/workflow/:workflowId([A-Fa-f0-9]{24})', permissions.checkPermission('workflows:view'), async function (req, res, next) {
  try {
    // Set up a database query that includes the specified workflow ID and a version number if also provided
    let query = { workflowId: req.params.workflowId };

    if (req.query.version) query['validity.version'] = parseInt(req.query.version, 10);

    // Retrieve the specified version of the record using the query
    // Simultaneously, retrieve ALL versions of the same record
    const [workflow, workflowVersions] = await Promise.all([
      Workflows.retrieve(query),
      Workflows.versions(req.params.workflowId),
    ]);

    // Throw an error if there is no record corresponding to the query
    if (!workflow) return res.status(404).render(`There is no workflow record with workflow ID = ${req.params.workflowId}`);

    // Retrieve the workflow type form, using its type form ID (which is specified in the record)
    const workflowTypeForm = await Forms.retrieve('workflowForms', workflow.typeFormId);

    // Throw an error if there is no type form corresponding to the type form ID
    if (!workflowTypeForm) return res.status(404).send(`There is no workflow type form with form ID = ${workflow.typeFormId}`);

    // Simultaneously retrieve lists of all component and action type forms that currently exist in their respective collections
    const [componentTypeForms, actionTypeForms] = await Promise.all([
      Forms.list('componentForms'),
      Forms.list('actionForms'),
    ]);

    // Render the interface page for viewing a workflow record
    res.render('workflow.pug', {
      workflow,
      workflowVersions,
      workflowTypeForm,
      componentTypeForms,
      actionTypeForms,
    });
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// Create a new workflow of a given type
router.get('/workflow/:typeFormId', permissions.checkPermission("workflows:edit"), async function (req, res, next) {
  try {
    // Retrieve the workflow type form corresponding to the specified type form ID
    const workflowTypeForm = await Forms.retrieve('workflowForms', req.params.typeFormId);

    // Throw an error if there is no type form corresponding to the type form ID
    if (!workflowTypeForm) return res.status(404).send(`There is no workflow type form with form ID = ${req.params.typeFormId}`);

    // Render the interface page for editing an existing workflow
    res.render('workflow_edit.pug', {
      workflowTypeForm,
      newWorkflow: true,
    });
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// Edit an existing workflow
router.get('/workflow/:workflowId([A-Fa-f0-9]{24})/edit', permissions.checkPermission("workflows:edit"), async function (req, res, next) {
  try {
    // Retrieve the most recent version of the record corresponding to the specified workflow ID
    const workflow = await Workflows.retrieve(req.params.workflowId);

    // Throw an error if there is no record corresponding to the workflow ID
    if (!workflow) return res.status(404).send(`There is no workflow record with workflow ID = ${req.params.workflowId}`);

    // Retrieve the workflow type form, using its type form ID (which is specified in the record)
    const workflowTypeForm = await Forms.retrieve('workflowForms', workflow.typeFormId);

    // Throw an error if there is no type form corresponding to the type form ID
    if (!workflowTypeForm) return res.status(404).send(`There is no workflow type form with form ID = ${workflow.typeFormId}`);

    // Render the interface page for editing an existing workflow
    res.render('workflow_edit.pug', {
      workflow,
      workflowTypeForm,
      newWorkflow: false,
    });
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// Update a single step result in the path of an existing workflow
router.get('/workflow/:workflowId([A-Fa-f0-9]{24})/:stepType/:stepResult', permissions.checkPermission("workflows:edit"), async function (req, res, next) {
  try {
    // Retrieve the most recent version of the record corresponding to the specified workflow ID
    const workflow = await Workflows.retrieve(req.params.workflowId);

    // Throw an error if there is no record corresponding to the workflow ID
    if (!workflow) return res.status(404).send(`There is no workflow record with workflow ID = ${req.params.workflowId}`);

    // Retrieve the index of the first incomplete step in the workflow path (this is the step whose result will be updated)
    let stepIndex = -99;

    for (let i = 0; i < workflow.path.length; i++) {
      if (workflow.path[i].result === '') {
        stepIndex = i;
        break;
      }
    }

    if (stepIndex === -99) return res.status(404).send(`There are no more steps to perform in the path of this workflow (ID = ${req.params.workflowId})`);

    // Check if this is the final step in the workflow, i.e. it will be complete after this step's result is saved
    let workflowStatus = 'In Progress';

    if ((stepIndex + 1) === workflow.path.length) workflowStatus = 'Complete';

    // Get the specified step type from the URL
    const stepType = req.params.stepType;

    // Throw an error if the step type is not valid
    if ((!(stepType === 'component')) && (!(stepType === 'action'))) return res.status(404).send(`The provided step type (${stepType}) is not valid (must be 'component' or 'action')`);

    // Get the specified step result from the URL
    const stepResult = req.params.stepResult;

    // Throw an error if the step result does not match the required regular expression for the given step type
    const matches_componentUuid = stepResult.match(/^[A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12}/g);
    const matchedComponent = (stepType === 'component') && matches_componentUuid;

    const matches_actionId = stepResult.match(/^[A-Fa-f0-9]{24}/g);
    const matchedAction = (stepType === 'action') && matches_actionId;

    if (!matchedComponent && !matchedAction) return res.status(404).send(`The provided step result (${stepResult}) is not valid for this step type ('${stepType}'')`);

    // Update the step result
    // This function returns the updated workflow record, but we don't actually need to use it
    const updatedWorkflow = await Workflows.updatePathStep(req.params.workflowId, stepIndex, stepResult, workflowStatus);

    // Redirect the user to the interface page for viewing the workflow record
    res.redirect(`/workflow/${req.params.workflowId}`);
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// Create a new workflow type form
router.get('/workflowTypes/:typeFormId/new', permissions.checkPermission('forms:edit'), async function (req, res) {
  try {
    // Check that the specified type form ID is not already being used
    // Attempt to retrieve any and all existing type forms with this type form ID
    let typeForm = await Forms.retrieve('workflowForms', req.params.typeFormId);

    // If there are no existing type forms, set up a new one using the specified type form ID and an initially empty form schema
    // Then save the new type form into the 'actionForms' collection of records
    // Initially, use the form ID as the form name as well - the user will have the option of changing the name later
    if (!typeForm) {
      typeForm = {
        formId: req.params.typeFormId,
        formName: req.params.typeFormId,
        schema: { components: [] },
      };

      Forms.save(typeForm, 'workflowForms', req);
    }

    // Redirect the user to the interface page for editing an existing workflow type form
    res.redirect(`/workflowTypes/${req.params.typeFormId}/edit`);
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// Edit an existing workflow type form
router.get('/workflowTypes/:typeFormId/edit', permissions.checkPermission('forms:edit'), async function (req, res) {
  try {
    // Render the interface page for editing an existing workflow type form
    res.render('workflow_editTypeForm.pug', {
      collection: 'workflowForms',
      formId: req.params.typeFormId,
    });
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// List all workflow types
router.get('/workflowTypes/list', permissions.checkPermission('workflows:view'), async function (req, res, next) {
  try {
    // Retrieve a list of all workflow type forms that currently exist in the 'workflowForms' collection
    const workflowTypeForms = await Forms.list('workflowForms');

    // Render the interface page for listing all workflow types
    res.render('workflow_listTypes.pug', { workflowTypeForms });
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// List all workflows across all workflow types
router.get('/workflows/list', permissions.checkPermission('workflows:view'), async function (req, res, next) {
  try {

    // Retrieve records of all workflows across all workflow types
    // The first argument ('match_condition') should be 'null' in order to match to any record
    const workflows = await Workflows.list(null, { limit: 100 });

    // Retrieve a list of all workflow type forms that currently exist in the 'workflowForms' collection
    const allWorkflowTypeForms = await Forms.list('workflowForms');

    // Render the interface page for showing a generic list of workflows
    res.render('workflow_list.pug', {
      workflows,
      singleType: false,
      title: 'All Created / Edited Workflows (All Types)',
      allWorkflowTypeForms,
    });
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// List all workflows of a single workflow type
router.get('/workflows/:typeFormId/list', permissions.checkPermission('workflows:view'), async function (req, res, next) {
  try {
    // Construct the 'match_condition' to be used for querying the database
    // For this route, it is that a record's workflow type form ID must match the specified one
    const match_condition = { typeFormId: req.params.typeFormId };

    // Retrieve a list of records that match the specified condition
    const workflows = await Workflows.list(match_condition, { limit: 100 });

    // Retrieve the workflow type form corresponding to the specified type form ID
    const workflowTypeForm = await Forms.retrieve('workflowForms', req.params.typeFormId);

    // Retrieve a list of all workflow type forms that currently exist in the 'workflowForms' collection
    const allWorkflowTypeForms = await Forms.list('workflowForms');

    // Render the interface page for showing a generic list of workflows
    res.render('workflow_list.pug', {
      workflows,
      singleType: true,
      title: 'All Created / Edited Workflows (Single Type)',
      workflowTypeForm,
      allWorkflowTypeForms,
    });
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


module.exports = router;
