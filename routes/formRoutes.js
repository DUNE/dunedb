const chalk = require('chalk');
const express = require('express');

var Components = require('../Components.js');
var Forms = require('../Forms.js');
var permissions = require('../permissions.js');
var database = require('../database.js')

var router = express.Router();


module.exports = {
  router,
}

//////////////////////////////////////////////////////////////////////////
// Editing and creating forms

console.log("forms",Forms);

// Create a new test form
var default_form_schema = JSON.parse(require('fs').readFileSync('default_form_schema.json'));

router.get("/NewTestForm/:form_id", permissions.middlewareCheckFormEditPrivs, async function(req,res){
  console.log("forms",Forms);
  var rec = await Forms.retrieveForm(req.params.form_id);
  
  if(!rec) {
      var forms = db.collection("testForms");
      // console.log('updateRes',updateRes)

      var rec = {form_id: req.params.form_id,
                schema: default_form_schema
               }; 
      rec.submit = {
        insertDate: new Date(),
        ip: req.ip,
        user: ((res.locals||{}).user||{}).email || "unknown",
        version: 0,
        diff_from: null,
        diff: null,
      }

      delete rec._id;
      rec.effectiveDate = new Date(0);
      rec.version = 0;
      rec.revised_by = ((res.locals||{}).user||{}).email || "unknown";
      console.log("inserting",rec);
      await forms.insertOne(rec);
  }

  res.redirect("/EditTestForm/"+req.params.form_id);
});

// Edit existing test form
router.get("/EditTestForm/:form_id?", permissions.middlewareCheckFormEditPrivs, async function(req,res){
  res.render('EditTestForm.pug',{collection:"testForms",form_id:req.params.form_id});
});

// Edit component form.
router.get("/EditComponentForm", permissions.middlewareCheckFormEditPrivs, async function(req,res){
  res.render('EditComponentForm.pug',{collection:"componentForm",form_id:"componentForm"});
});



