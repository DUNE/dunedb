const chalk = require('chalk');
const express = require('express');

var Components = require('../Components.js');
var Forms = require('../Forms.js');
var permissions = require('../permissions.js');
var database = require('../database.js')

var router = express.Router();


module.exports = router;

//////////////////////////////////////////////////////////////////////////
// Editing and creating forms

// console.log("forms",Workflows);

// Create a new job form
var default_form_schema = JSON.parse(require('fs').readFileSync('default_form_schema.json'));

router.get("/NewWorkflowForm/:form_id", permissions.checkPermission("forms:edit"), async function(req,res){
  var rec = await Forms.retrieveForm("jobForms",req.params.form_id);
  
  if(!rec) {
      var forms = db.collection("jobForms");
      // console.log('updateRes',updateRes)

      var rec = {form_id: req.params.form_id,
                schema: default_form_schema
               }; 
      rec.submit = {
        insertDate: new Date(),
        ip: req.ip,
        user: req.user,
        version: 0,
        diff_from: null,
        diff: null,
      }

      delete rec._id;
      rec.effectiveDate = new Date(0);
      console.log("inserting",rec);
      await forms.insertOne(rec);
  }

  res.redirect("/EditWorkflowForm/"+req.params.form_id);
});

// Edit existing job form
router.get("/EditWorkflowForm/:form_id?", permissions.checkPermission("forms:edit"), async function(req,res){
  res.render('EditWorkflowForm.pug',{collection:"jobForms",form_id:req.params.form_id});
});


