const router = require('express').Router();

const Components = require('../lib/Components');
const Forms = require('../lib/Forms');
const logger = require('../lib/logger');
const permissions = require('../lib/permissions');
const Workflows = require('../lib/Workflows');


/// View a single workflow record
router.get('/workflow/:workflowId([A-Fa-f0-9]{24})', permissions.checkPermission('workflows:view'), async function (req, res, next) {
  try {
    // Set up a query object consisting of the specified workflow ID and a version number if one is provided (if not, the most recent version is assumed)
    let query = { workflowId: req.params.workflowId };

    if (req.query.version) query['validity.version'] = parseInt(req.query.version, 10);

    // Simultaneously retrieve the specified version and all versions of the record, and throw an error if there is no record corresponding to the workflow ID
    const [workflow, workflowVersions] = await Promise.all([
      Workflows.retrieve(query),
      Workflows.versions(req.params.workflowId),
    ]);

    if (!workflow) return res.status(404).render(`There is no workflow record with workflow ID = ${req.params.workflowId}`);

    // Retrieve the workflow type form corresponding to the type form ID in the workflow record, and throw an error if there is no such type form
    const workflowTypeForm = await Forms.retrieve('workflowForms', workflow.typeFormId);

    if (!workflowTypeForm) return res.status(404).send(`There is no workflow type form with form ID = ${workflow.typeFormId}`);

    // Attempt to retrieve a user-defined 'name' from the record of the component associated with this workflow (only if the component has already been created)
    let componentName = '';

    if (workflow.path[0].result.length > 0) {
      const component = await Components.retrieve(workflow.path[0].result);

      if (component) {
        if (component.data.name) {
          componentName = component.data.name;
        } else {
          componentName = workflow.path[0].result;
        }
      }
    }

    // Simultaneously retrieve lists of all component and action type forms that currently exist in their respective collections
    const [componentTypeForms, actionTypeForms] = await Promise.all([
      Forms.list('componentForms'),
      Forms.list('actionForms'),
    ]);

    // Render the interface page
    res.render('workflow.pug', {
      workflow,
      workflowVersions,
      workflowTypeForm,
      componentName,
      componentTypeForms,
      actionTypeForms,
    });
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// Create a new workflow
router.get('/workflow/:typeFormId', permissions.checkPermission('workflows:edit'), async function (req, res, next) {
  try {
    // Retrieve the workflow type form corresponding to the specified type form ID, and throw an error if there is no such type form
    const workflowTypeForm = await Forms.retrieve('workflowForms', req.params.typeFormId);

    if (!workflowTypeForm) return res.status(404).send(`There is no workflow type form with form ID = ${req.params.typeFormId}`);

    // Render the interface page
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
router.get('/workflow/:workflowId([A-Fa-f0-9]{24})/edit', permissions.checkPermission('workflows:edit'), async function (req, res, next) {
  try {
    // Retrieve the most recent version of the record corresponding to the specified workflow ID, and throw an error if there is no such record
    const workflow = await Workflows.retrieve(req.params.workflowId);

    if (!workflow) return res.status(404).send(`There is no workflow record with workflow ID = ${req.params.workflowId}`);

    // Retrieve the workflow type form corresponding to the type form ID in the workflow record, and throw an error if there is no such type form
    const workflowTypeForm = await Forms.retrieve('workflowForms', workflow.typeFormId);

    if (!workflowTypeForm) return res.status(404).send(`There is no workflow type form with form ID = ${workflow.typeFormId}`);

    // Render the interface page
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
router.get('/workflow/:workflowId([A-Fa-f0-9]{24})/:stepType/:stepResult', permissions.checkPermission('workflows:edit'), async function (req, res, next) {
  try {
    // Retrieve the most recent version of the record corresponding to the specified workflow ID, and throw an error if there is no such record
    const workflow = await Workflows.retrieve(req.params.workflowId);

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

    // Check if this is the final step in the workflow, i.e. if the workflow is complete after this step's result is saved
    let workflowStatus = 'In Progress';

    if ((stepIndex + 1) === workflow.path.length) workflowStatus = 'Complete';

    // Get the specified step type from the URL, and throw an error if it is not valid
    const stepType = req.params.stepType;

    if ((!(stepType === 'component')) && (!(stepType === 'action'))) return res.status(404).send(`The provided step type (${stepType}) is not valid (must be 'component' or 'action')`);

    // Get the specified step result from the URL, and throw an error if the step result does not match the corresponding regular expression
    const stepResult = req.params.stepResult;

    const matches_componentUuid = stepResult.match(/^[A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12}/g);
    const matchedComponent = (stepType === 'component') && matches_componentUuid;

    const matches_actionId = stepResult.match(/^[A-Fa-f0-9]{24}/g);
    const matchedAction = (stepType === 'action') && matches_actionId;

    if (!matchedComponent && !matchedAction) return res.status(404).send(`The provided step result (${stepResult}) is not valid for this step type ('${stepType}'')`);

    // Update the step result
    // If successful, the updating function returns 'result = 1', but we don't actually need this value for anything
    const result = await Workflows.updatePathStep(req.params.workflowId, stepIndex, stepResult, workflowStatus);

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
    // Check that the specified type form ID is not already being used - attempt to retrieve any and all existing type forms with this type form ID
    let typeForm = await Forms.retrieve('workflowForms', req.params.typeFormId);

    // If there are no existing type forms, set up a new one using the specified type form ID and an initially empty form schema, and save it into the 'workflowForms' collection of records
    // Use the form ID as the form name to start with - the user will have the option of changing the name later via the interface
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
    // Render the interface page
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

    // Render the interface page
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
    // The first argument should be 'null' in order to match to any type form ID
    const workflows = await Workflows.list(null, { limit: 200 });

    // Retrieve a list of all workflow type forms that currently exist in the 'workflowForms' collection
    const allWorkflowTypeForms = await Forms.list('workflowForms');

    // Render the interface page
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
    // Retrieve records of all workflows with the specified workflow type
    // The first argument should be an object consisting of the match condition, i.e. the type form ID to match to
    const workflows = await Workflows.list({ typeFormId: req.params.typeFormId }, { limit: 200 });

    // Retrieve the workflow type form corresponding to the specified type form ID
    const workflowTypeForm = await Forms.retrieve('workflowForms', req.params.typeFormId);

    // Retrieve a list of all workflow type forms that currently exist in the 'workflowForms' collection
    const allWorkflowTypeForms = await Forms.list('workflowForms');

    // Render the interface page
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
