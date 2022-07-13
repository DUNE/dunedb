const { readFileSync } = require('fs');
const router = require('express').Router();

const Forms = require('lib/Forms.js');
const logger = require('../lib/logger');
const permissions = require('lib/permissions.js');
const Workflows = require('lib/Workflows.js');


const Components = require('lib/Components.js');
const utils = require('lib/utils.js');


const default_form_schema = JSON.parse(readFileSync('./schemas/default_form_schema.json'));




/// View a workflow
router.get('/workflow/:workflowId([A-Fa-f0-9]{24})', permissions.checkPermission("workflows:view"), async function(req, res, next) {
    try {
        // Retrieve the workflow's DB record using the specified workflow ID
        // Throw an error if there is no record corresponding to this ID
        var workflow = await Workflows.retrieve(req.params.workflowId);
        
        if(!workflow) {
            return res.status(400).send("There is no DB record for a workflow with ID: " + req.params.workflowId);
        }
        
        // Get the workflow's type form ID
        // Throw an error if the form's ID cannot be found within the workflow's DB record
        var formId = workflow.formId;
        
        if(!formId) {
            return res.status(400).send("This workflow (ID: " + req.params.workflowId + ") has no type form ID!");
        }
        
        // Retrieve the workflow's type form using its form ID
        // Throw an error if there is no DB record corresponding to the form ID
        var form = await Forms.retrieve('workflowForms', formId);
        
        if(!form) {
            return res.status(400).send("There is no DB record for a workflow type with form ID: " + formId);
        }
        
        // Retrieve a list of components that have the same type as that which is associated with the workflow
        // This is done by matching against the component type form ID stored in the workflow's record
        var components = await Components.list({'formId': workflow.componentFormId});
        
        // Retrieve a list of all existing component type forms
        var componentTypeForms = await Forms.list('componentForms');
        
        // Render the page for viewing the workflow
        res.render('workflow.pug', {
            workflow, 
            form, 
            components, 
            componentForms
        });
    } catch(err) {
        logger.error(err);
        res.status(400).send(err.toString());
    }
});

/// Create a new workflow of a given type
router.get('/workflow/:formId', permissions.checkPermission("workflows:edit"), async function(req, res, next) {
    try {
        // Retrieve the workflow type form corresponding to the specified form ID
        // Set the retrieval (and therefore, workflow submission) timestamp to be the current date and time
        // Throw an error if there is no DB record corresponding to the form ID
        var form = await Forms.retrieve('workflowForms', req.params.formId, {onDate: new Date()});
        
        if(!form) {
            return res.status(400).send("There is no DB record for a workflow type with form ID: " + req.params.formId);
        }
        
        // Render the page for editing an existing new workflow
        res.render('edit_workflow.pug', {form});
    } catch(err) {
        logger.error(err);
        res.status(400).send(err.toString());
    }
});

/// Edit an existing workflow
router.get('/workflow/:workflowId([A-Fa-f0-9]{24})/edit', permissions.checkPermission("workflows:edit"), async function(req, res, next) {
    try {
        // Retrieve the workflow's DB record using the specified workflow ID
        // Throw an error if there is no record corresponding to this ID
        var workflow = await Workflows.retrieve(req.params.workflowId);
        
        if(!workflow) {
            return res.status(400).send("There is no DB record for a workflow with ID: " + req.params.workflowId);
        }
        
        // Get the workflow's type form ID
        // Throw an error if the form's ID cannot be found within the workflow's DB record
        var formId = workflow.formId;
        
        if(!formId) {
            return res.status(400).send("This workflow (ID: " + req.params.workflowId + ") has no type form ID!");
        }
        
        // Retrieve the workflow's type form using its form ID
        // Throw an error if there is no DB record corresponding to the form ID
        var form = await Forms.retrieve('workflowForms', formId);
        
        if(!form) {
            return res.status(400).send("There is no DB record for a workflow type with form ID: " + formId);
        }
        
        // Render the page for editing an existing workflow
        res.render('edit_workflow.pug', {
            workflowId: req.params.workflowId, 
            workflow, 
            form
        });
    }  catch(err) {
        logger.error(err);
        res.status(400).send(err.toString());
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
      title: 'All Performed Workflows (All Types)',
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
      title: 'All Performed Workflows (Single Type)',
      workflowTypeForm,
      allWorkflowTypeForms,
    });
  } catch(err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


module.exports = router;
