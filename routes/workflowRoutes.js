const chalk = require('chalk');
const express = require('express');

var Components = require('lib/Components.js');
var Forms = require('lib/Forms.js');
var permissions = require('lib/permissions.js');

var router = express.Router();


module.exports = router;

//////////////////////////////////////////////////////////////////////////
// Editing and creating forms

// logger.info("forms",Workflows);

// Create a new job form
var default_form_schema = JSON.parse(require('fs').readFileSync('dbSeed/default_form_schema.json'));

router.get("/NewWorkflowForm/:formId", permissions.checkPermission("forms:edit"), async function(req,res){
  var rec = await Forms.retrieve("jobForms",req.params.formId);
  
  if(!rec) {

      var rec = {formId: req.params.formId,
                 formName: req.params.formId,
                 schema: default_form_schema
               }; 

      Forms.save(rec,'jobForms',req);
  }

  res.redirect("/EditWorkflowForm/"+req.params.formId);
});

// Edit existing job form
router.get("/EditWorkflowForm/:formId?", permissions.checkPermission("forms:edit"), async function(req,res){
  res.render('EditWorkflowForm.pug',{collection:"jobForms",formId:req.params.formId});
});


// Lists kinds tests that can be performed
router.get('/workflows', permissions.checkPermission("tests:view"), 
  async function(req,res,next) {
    var forms = await Forms.list('jobForms');
    res.render('listJobForms.pug',{ forms: forms});
  });