const chalk = require('chalk');
const express = require('express');

var Components = require('lib/Components.js');
var Forms = require('lib/Forms.js');
var permissions = require('lib/permissions.js');

var router = express.Router();


module.exports = router;

//////////////////////////////////////////////////////////////////////////
// Editing and creating forms

// Create a new test form
var default_form_schema = JSON.parse(require('fs').readFileSync('dbSeed/default_form_schema.json'));

router.get("/NewTestForm/:formId", permissions.checkPermission("forms:edit"), async function(req,res){
  var rec = await Forms.retrieve("testForms",req.params.formId);
  
  if(!rec) {
      var rec = {formId: req.params.formId,
                 formName: req.params.formId,
                 schema: default_form_schema
               }; 

      Forms.save(rec,'testForms',req);
  }

  res.redirect("/EditTestForm/"+req.params.formId);
});

// Edit existing test form
router.get("/EditTestForm/:formId?", permissions.checkPermission("forms:edit"), async function(req,res){
  var componentTypes = await Components.getTypes();
  res.render('EditTestForm.pug',{collection:"testForms",componentTypes,formId:req.params.formId});
});


// Lists kinds tests that can be performed
router.get('/testForms', permissions.checkPermission("tests:view"), 
  async function(req,res,next) {
    var forms = await Forms.list('testForms');
    res.render('listTestForms.pug',{forms});
  });



