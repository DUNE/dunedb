'use strict';

const Components = require('lib/Components.js')('component');
const express = require('express');
const Forms = require('lib/Forms.js');
const logger = require('../lib/logger');
const permissions = require('lib/permissions.js');
const utils = require('lib/utils.js');
const Workflows = require('lib/Workflows.js');

var router = express.Router();
module.exports = router;

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
var default_form_schema = JSON.parse(require('fs').readFileSync('./schemas/default_form_schema.json'));

router.get('/workflows/:formId/new', permissions.checkPermission("forms:edit"), async function(req, res) {
    try {
        // Retrieve any and all existing workflow type forms with the same form ID as the one provided
        var form = await Forms.retrieve('workflowForms', req.params.formId);
        
        // If there are no existing forms, set up a new one using the ID and the default form schema
        // Initially, use the form ID as the form name as well - the user will have the option of changing the name later
        if(!form) {
            var form = {
                formId: req.params.formId,
                formName: req.params.formId,
                schema: default_form_schema
            }; 
            
            Forms.save(form, 'workflowForms', req);
        }
        
        // Redirect the user to the page for editing an existing workflow type form
        res.redirect('/workflows/' + req.params.formId + '/edit');
    } catch(err) {
        logger.error(err);
        res.status(400).send(err.toString());
    }
});

/// Edit an existing workflow type form
router.get('/workflows/:formId/edit', permissions.checkPermission("forms:edit"), async function(req, res) {
    try {
        // Render the page for editing an existing workflow type form
        res.render('edit_workflowTypeForm.pug', {
            collection: 'workflowForms',
            formId: req.params.formId
        });
    } catch(err) {
        logger.error(err);
        res.status(400).send(err.toString());
    }
});

/// List all workflow types
router.get('/workflows/types', permissions.checkPermission("workflows:view"), async function(req, res, next) {
    try {
        // Retrieve a list of all workflow type forms that currently exist
        var forms = await Forms.list('workflowForms');
        
        // Render the page for listing all workflow types
        res.render('list_workflowTypes.pug', {forms});
    } catch(err) {
        logger.error(err);
        res.status(400).send(err.toString());
    }
});

/// List recently edited workflows across all types
router.get('/workflows/recent', permissions.checkPermission("workflows:view"), async function(req, res, next) {
    try {
        // Retrieve a list of recently edited workflows across all workflow types
        // Since no type form ID is given (matching condition = 'null'), all types will be included
        // Set a limit on the number of displayed workflows (otherwise every single one in the DB will be shown!)
        var workflows = await Workflows.list(null, {limit: 100});
        
        // Render the page for showing a generic list of workflows
        res.render('list_workflows.pug', {
            workflows, 
            singleType: false, 
            title: "Recently Edited Workflows (All Types)"
        });
    } catch(err) {
        logger.error(err);
        res.status(400).send(err.toString());
    }
});

/// List recently edited workflows of a single type
router.get('/workflows/:formId/list', permissions.checkPermission("workflows:view"), async function(req, res, next) {
    try {
        // Construct the 'match conditions' to be passed to the 'list()' library function
        // For this, it is simply the requirement that the workflow type form ID must match the one provided
        var match = (req.params.formId) ? {formId: req.params.formId} : {};
        
        // Retrieve a list of recently edited workflows with a matching type form ID
        // Set a limit on the number of displayed workflows (otherwise every single one in the DB will be shown!)
        var workflows = await Workflows.list(match, {limit: 100});
        
        // Retrieve the workflow type form corresponding to the provided form ID
        var form = await Forms.retrieve('workflowForms', req.params.formId);
        
        // Render the page for showing a generic list of workflows
        res.render('list_workflows.pug', {
            workflows, 
            singleType: true, 
            title: "Recently Edited Workflows (Single Type)",
            form
        });
    } catch(err) {
        logger.error(err);
        res.status(400).send(err.toString());
    }
});
