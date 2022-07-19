const { readFileSync } = require('fs');
const router = require('express').Router();

const Forms = require('lib/Forms.js');
const logger = require('../lib/logger');
const permissions = require('lib/permissions.js');
const utils = require('lib/utils.js');
const Workflows = require('lib/Workflows.js');

const default_form_schema = JSON.parse(readFileSync('./schemas/default_form_schema.json'));


/// View a single workflow record
router.get('/workflow/:workflowId([A-Fa-f0-9]{24})', permissions.checkPermission('workflows:view'), async function(req, res, next) {
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

    // Render the interface page for viewing a workflow record
    res.render('workflow.pug', {
      workflow,
      workflowVersions,
      workflowTypeForm, 
    });
  } catch(err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// Create a new workflow of a given type
router.get('/workflow/:typeFormId', permissions.checkPermission("workflows:edit"), async function(req, res, next) {
  try {
    // Retrieve the workflow type form corresponding to the specified type form ID
    const workflowTypeForm = await Forms.retrieve('workflowForms', req.params.typeFormId);
    
    // Throw an error if there is no type form corresponding to the type form ID
    if (!workflowTypeForm) return res.status(404).send(`There is no workflow type form with form ID = ${req.params.typeFormId}`);
    
    // Render the interface page for editing an existing workflow
    res.render('workflow_edit.pug', { workflowTypeForm });
  } catch(err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// Edit an existing workflow
router.get('/workflow/:workflowId([A-Fa-f0-9]{24})/edit', permissions.checkPermission("workflows:edit"), async function(req, res, next) {
  try {
     // Retrieve the most recent version of the record corresponding to the specified action ID
    const workflow = await Workflows.retrieve(req.params.workflowId);
    
    // Throw an error if there is no record corresponding to the action ID
    if (!workflow) return res.status(404).send(`There is no workflow record with workflow ID = ${req.params.workflowId}`);
    
    // Retrieve the workflow type form, using its type form ID (which is specified in the record)
    const workflowTypeForm = await Forms.retrieve('workflowForms', workflow.typeFormId);
    
    // Throw an error if there is no type form corresponding to the type form ID
    if (!workflowTypeForm) return res.status(404).send(`There is no workflow type form with form ID = ${workflow.typeFormId}`);
    
    // Render the interface page for editing an existing workflow
    res.render('workflow_edit.pug', {
      workflow, 
      workflowTypeForm,
    });
  } catch(err) {
    logger.error(err);
    res.status(500).send(err.toString());
    }
});






/// View the status of a specified component with respect to a workflow
router.get('/workflow/:workflowId([A-Fa-f0-9]{24})/' + utils.uuid_regex, permissions.checkPermission("workflows:view"), async function(req, res, next) {
    try {
        // Evaluate the workflow with respect to the component
        // The workflow is specified via its workflow ID, and the component is specified using its UUID
        var evaluatedWorkflow = await Workflows.evaluate(req.params.workflowId, req.params.uuid);
        
        // Render the page for viewing the evaluated workflow
        res.render('workflow_evaluated.pug', {
            evaluatedWorkflow,
            componentUuid: req.params.uuid
        });
    } catch(err) {
        logger.error(err);
        res.status(400).send(err.toString());
    }
});

/// Move to the next step of a workflow involving a specified component
router.get('/workflow/:workflowId([A-Fa-f0-9]{24})/' + utils.uuid_regex + '/next?', permissions.checkPermission("workflows:view"), async function(req, res, next) {
    try {
        // Retrieve the next step in the workflow that relates to the component
        // The workflow is specified via its workflow ID, and the component is specified using its UUID
        // Throw an error if there is no valid next step corresponding to the workflow ID and UUID
        var next_step = await Workflows.nextStep(req.params.workflowId, req.params.uuid, req.query.firstUnfinished);
        
        if(!next_step) {
            return res.status(400).send("There is no valid next step for a workflow with ID: " + req.params.workflowId + " and associated component with UUID: " + req.params.uuid);
        }
        
        // Depending on the properties of the retrieved step, return the appropriate URL to redirect to
        // Throw an error if the properties do not correspond to a known redirection
        
        // If the next step is workflow completion ...
        if(next_step.done) {
            return res.redirect('/workflow/' + req.params.workflowId + '/' + req.params.uuid);
        }
        
        // If the next step is to create a new component of a specified type ...
        if(next_step.type === 'component') {
            return res.redirect('/component/' + next_step.formId);
        }
        
        // If the next step is to run a new test on the component ...
        if(next_step.type === 'test') {
            return res.redirect('/test/' + next_step.formId + '/' + req.params.uuid);
        }
        
        // If the next step is to submit a new job ...
        if(next_step.type === 'job') {
            return res.redirect('/job/' + next_step.formId);
        }
        
        return res.status(400).send("Could not determine how to proceed with the next step: " + JSON.stringify(next_step, null, 2) + " in the workflow with ID: " + req.params.workflowId);
    } catch(err) {
        logger.error(err);
        res.status(400).send(err.toString());
    }
});








/// Create a new workflow type form
router.get('/workflowTypes/:typeFormId/new', permissions.checkPermission('forms:edit'), async function(req, res) {
  try {
    // Check that the specified type form ID is not already being used
    // Attempt to retrieve any and all existing type forms with this type form ID
    let typeForm = await Forms.retrieve('workflowForms', req.params.typeFormId);

    // If there are no existing type forms, set up a new one using the specified type form ID and the default form schema
    // Then save the new type form into the 'actionForms' collection of records
    // Initially, use the form ID as the form name as well - the user will have the option of changing the name later
    if (!typeForm) {
      typeForm = {
        formId: req.params.typeFormId,
        formName: req.params.typeFormId,
        schema: default_form_schema,
      };

      Forms.save(typeForm, 'workflowForms', req);
    }
        
    // Redirect the user to the interface page for editing an existing workflow type form
    res.redirect(`/workflowTypes/${req.params.typeFormId}/edit`);
  } catch(err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// Edit an existing workflow type form
router.get('/workflowTypes/:typeFormId/edit', permissions.checkPermission('forms:edit'), async function(req, res) {
  try {
    // Render the interface page for editing an existing workflow type form
    res.render('workflow_editTypeForm.pug', {
      collection: 'workflowForms',
      formId: req.params.typeFormId,
    });
  } catch(err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// List all workflow types
router.get('/workflowTypes/list', permissions.checkPermission('workflows:view'), async function(req, res, next) {
  try {
    // Retrieve a list of all workflow type forms that currently exist in the 'workflowForms' collection
    const workflowTypeForms = await Forms.list('workflowForms');
        
    // Render the interface page for listing all workflow types
    res.render('workflow_listTypes.pug', {workflowTypeForms});
  } catch(err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// List all workflows across all workflow types
router.get('/workflows/list', permissions.checkPermission('workflows:view'), async function(req, res, next) {
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
  } catch(err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// List all workflows of a single workflow type
router.get('/workflows/:typeFormId/list', permissions.checkPermission('workflows:view'), async function(req, res, next) {
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
  } catch(err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


module.exports = router;
