'use strict';

// General pug requirements
const chalk = require('chalk');
const express = require('express');

// Local Javascript libraries
const Components = require('lib/Components.js');
const Forms = require('lib/Forms.js');
const permissions = require('lib/permissions.js');
const Processes = require('lib/Processes.js');
const Tests = require('lib/Tests.js')('test');
const utils = require("lib/utils.js");

var router = express.Router();
module.exports = router;


// look at a test result.
router.get("/test/:record_id([A-Fa-f0-9]{24})", permissions.checkPermission("tests:view"), 
  async function(req,res,next) {
    try{
      logger.info("finding test ",req.params.record_id)
      var options = {};
      // get stuff in one go
      let [test,processes] = await Promise.all([
          Tests.retrieve(req.params.record_id),
          Processes.findInputRecord(req.params.record_id),
        ]);

      var component = await Components.retrieve(test.componentUuid);

      if(!test) return res.status(404).render("No such test recorded.");
      var formId = test.formId;
      if(!formId) throw("Test has no formId");

      if(req.query.version) options.version = parseInt(req.query.version);
      
      // fixme rollback
      var formrec = await Forms.retrieve('testForms',formId,options);
      var versions = await Forms.getFormVersions('testForms',formId);
      logger.info('versions',versions);
      if(!formrec) return res.status(400).send("No such test form");  
      res.render('viewTest.pug',{formId:req.params.formId, formrec, testdata:test, processes, versions, component, retrieved:true})
  } catch(err) {  logger.error(err); res.status(400).send(err.toString()); }

});

// Run a test, but no UUID specified
router.get("/test/:formId",permissions.checkPermission("tests:submit"),async function(req,res,next){
  var form = await Forms.retrieve('testForms',req.params.formId,);
  res.render('test_without_uuid.pug',{formId:req.params.formId,form:form});
})

/// Run a test
router.get("/"+utils.uuid_regex+"/test/:formId", permissions.checkPermission("tests:submit"),
async function(req,res,next) {
  try{
    logger.info("run a new test");
    // only look for test version that's current now.
    var options = {onDate: new Date()};
    var form = await Forms.retrieve('testForms',req.params.formId,options);
    if(!form) return res.status(400).send("No such test form");
    res.render('test.pug',{formId:req.params.formId, form, componentUuid: req.params.uuid})
  } catch(err) {  logger.error(err); res.status(400).send(err.toString()); }
});

/// Run a multitest
router.get("/multitest/:formId", permissions.checkPermission("tests:submit"),
async function(req,res,next) {
  try{
    logger.info("run a multitest session");
    var options = {onDate: new Date()};
    var form = await Forms.retrieve('testForms',req.params.formId,options);
    if(!form) return res.status(400).send("No such test form");
    res.render('run_multi_test.pug',{formId:req.params.formId, form})
  } catch(err) {  logger.error(err); res.status(400).send(err.toString()); }
});


// Resume editing a draft
router.get("/test/draft/:record_id([A-Fa-f0-9]{24})", permissions.checkPermission("tests:submit"),
async function(req,res,next) {
  try{
    logger.info("resume draft",req.params.record_id);
    // get the draft.
    var testdata = await Tests.retrieve(req.params.record_id);
    if(!testdata) next();
    if(testdata.state != "draft") return res.status(400).send("Data is not a draft");
    logger.info(testdata);
    if(!testdata.formId) return res.status(400).send("Can't find test data");

    var form = await Forms.retrieve('testForms',testdata.formId);
    if(!form) return res.status(400).send("No such test form");
    res.render('test.pug',{formId: testdata.formId, form:form, componentUuid: testdata.componentUuid, testdata:testdata})
  } catch(err) {  logger.error(err); res.status(400).send(err.toString()); }
});

router.get("/test/deleteDraft/:record_id([A-Fa-f0-9]{24})", permissions.checkPermission("tests:submit"),
async function(req,res,next) {
  try{
    logger.info("delete draft",req.params.record_id);
    // get the draft.
    var testdata = await Tests.retrieve(req.params.record_id);
    if(!testdata) next();
    if(testdata.state != "draft") return res.status(400).send("Data is not a draft");
    if(testdata.insertion.user.user_id != req.user.user_id) return res.status(400).send("You are not the draft owner");

    await Tests.deleteDraft(req.params.record_id);
    var backURL=req.header('Referer') || '/';
    res.redirect(backURL);
  } catch(err) {  logger.error(err); res.status(400).send(err.toString()); }
});

router.get('/test/copyAsDraft/:record_id([A-Fa-f0-9]{24})',permissions.checkPermission("tests:submit"),
  async function(req,res,next) {
    try{
      var newdraft = await Tests.copyToDraft(req.params.record_id,req);
      logger.info("Made copy ",newdraft);
      if(newdraft) res.redirect("/test/draft/"+newdraft.toString())

    } catch(err) {  logger.error(err); res.status(400).send(err.toString()); }

})








// Create a new test type form
var default_form_schema = JSON.parse(require('fs').readFileSync('dbSeed/default_form_schema.json'));

router.get('/testType/new/:formId', permissions.checkPermission("forms:edit"), async function(req, res)
{
  // Check if there is any record of an existing test type form with the same form ID as specified
  var rec = await Forms.retrieve("testForms", req.params.formId);
  
  // If there is no existing test type form, set up a new record using the user-specified information and the default form schema
  if(!rec)
  {
    var rec = {formId: req.params.formId,
               formName: req.params.formId,
               schema: default_form_schema}; 

    Forms.save(rec, 'testForms', req);
  }

  // Redirect the user to the page for editing a test type form (is the same as for creating a new one)
  res.redirect('/testType/edit/' + req.params.formId);
});


// Edit an existing test type form
router.get('/testType/edit/:formId?', permissions.checkPermission("forms:edit"), async function(req, res)
{
  // Get a list of component types (since a particular test type must be associated with a component type)
  var componentTypes = await Components.getTypes();
  
  // Render the test type editing page
  res.render('edit_testTypeForm.pug', {collection: "testForms",
                                       componentTypes,
                                       formId: req.params.formId});
});


// List recently performed tests, either across all test types or from a specific one
router.get('/tests/:formId?', permissions.checkPermission("tests:view"), async function(req, res, next)
{
  // Get a list of recently performed tests for a given test type (using the type form ID)
  // If the ID is not given, this gives a list of all recently performed tests across all types
  var tests = await Tests.listRecent(req.params.formId, (req.query || {}).N);
  
  // Render the page showing the list of tests
  res.render("list_tests.pug", {formId: req.params.formId,
                                tests: tests});
});


// Lists the test types
router.get('/testTypes', permissions.checkPermission("tests:view"), async function(req, res, next)
{
  // Get a list of all test type forms that exist
  var forms = await Forms.list('testForms');
  
  // Render the page showing the list of test types
  res.render("list_testTypes.pug", {forms});
});

