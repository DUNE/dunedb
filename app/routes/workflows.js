const router = require('express').Router();

const Actions = require('../lib/Actions');
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

    // Retrieve and store the status of each action that has been performed (i.e. that has a result) - that is, the value (true or false) of the action's 'data.actionComplete' field
    // Note that this field is common across all action type forms that are used in workflows, and so it should always exist one way or the other
    let actionsDictionary = {};

    for (let stepIndex = 1; stepIndex < workflow.path.length; stepIndex++) {
      if (workflow.path[stepIndex].result.length > 0) {
        const action = await Actions.retrieve(workflow.path[stepIndex].result);

        actionsDictionary[stepIndex] = action.data.actionComplete;
      } else {
        actionsDictionary[stepIndex] = false;
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
      actionsDictionary,
      componentTypeForms,
      actionTypeForms,
      queryDictionary: req.query,
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


/// Update a single step result in the path of an existing workflow, and re-determine the workflow completion status
router.get('/workflow/:workflowId([A-Fa-f0-9]{24})/:stepIndex/:stepResult', permissions.checkPermission('workflows:edit'), async function (req, res, next) {
  try {
    // This route is accessed in one of two situations:
    // 1) when submitting a completely new workflow-related action ... in which case, the step index will be a positive integer and the workflow path step result will need to be updated
    // 2) when editing an existing workflow-related action ... in which case the step index will always be -99 and no change needs to be made to the workflow path step result
    // 
    // In either case, the workflow completion status must always be updated after any changes to the path step results have been made
    // Note that the step index is passed to this function as a string, and therefore first needs to be converted to an integer
    const stepIndex = parseInt(req.params.stepIndex, 10);
    let result = null;

    if (stepIndex !== -99) {
      result = await Workflows.updatePathStep(req.params.workflowId, stepIndex, req.params.stepResult);
    }

    result = await Workflows.updateCompletionStatus(req.params.workflowId);

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
    let workflowTypeForms = await Forms.list('workflowForms');

    // Copy the existing 'APA_Assembly' entry in the list to two new entries, keyed by location, and then remove the 'APA_Assembly' entry
    // This will allow the interface to show separate listing pages for the UK and US APA Assembly workflows
    workflowTypeForms['APA_Assembly_US'] = workflowTypeForms['APA_Assembly'];
    workflowTypeForms['APA_Assembly_UK'] = workflowTypeForms['APA_Assembly'];

    delete workflowTypeForms['APA_Assembly'];

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
    // Set up the object containing the options ... to start with, this only consists of a limit on the number of records to return
    // If a location has been provided in the query, add it to the object under the appropriate field
    let options = { limit: 200 };

    if (req.query.location) { options.location = req.query.location; }

    // Retrieve records of all workflows with the specified workflow type
    // The first argument should be an object consisting of the match condition, i.e. the type form ID to match to
    const workflows = await Workflows.list({ typeFormId: req.params.typeFormId }, options);

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
