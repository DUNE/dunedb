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


// View the results of a single test
router.get('/test/:record_id([A-Fa-f0-9]{24})', permissions.checkPermission("tests:view"), async function(req, res, next)
{
  try
  {
    logger.info("Finding test ", req.params.record_id)
    
    var options = {};
    
    // Get all information relating to the test in one go
    let [test, processes] = await Promise.all(
    [
      Tests.retrieve(req.params.record_id),
      Processes.findInputRecord(req.params.record_id)
    ]);

    // Throw an error if there is no test corresponding to the given record ID
    if(!test)
    {
      return res.status(404).render("No such test recorded.");
    }
    
    // Get the form ID of the test type, followed by any other relevant information
    // Throw an error if the form ID cannot be found
    var formId = test.formId;
    
    if(!formId)
    {
      throw("Test has no formId.");
    }

    if(req.query.version)
    {
      options.version = parseInt(req.query.version);
    }
    
    var formrec = await Forms.retrieve('testForms', formId, options);
    
    if(!formrec)
    {
      return res.status(400).send("No such test form.");
    }
    
    var versions = await Forms.getFormVersions('testForms', formId);
    logger.info('versions', versions);
    
    // Get the UUID of the component that the test was performed on
    var component = await Components.retrieve(test.componentUuid);
  
    // Render the test results viewing page
    res.render('test_viewResult.pug', {formId: req.params.formId,
                                       formrec,
                                       testdata: test,
                                       processes,
                                       versions,
                                       component,
                                       retrieved: true})
  }
  catch(err)
  {
    logger.error(err);
    res.status(400).send(err.toString());
  }
});


// Run a test on a single component without specifying the component's UUID
router.get('/test/:formId', permissions.checkPermission("tests:submit"), async function(req, res, next)
{
  // Get the test type form corresponding to the desired test
  var form = await Forms.retrieve('testForms', req.params.formId);
  
  // Render the single-component test page
  res.render('test_run_noComponent.pug', {formId: req.params.formId,
                                          form: form});
});


// Run a test on a single component with the specified component UUID
router.get('/test/:formId/' + utils.uuid_regex, permissions.checkPermission("tests:submit"), async function(req, res, next)
{
  try
  {
    logger.info("Run a new test");
    
    // Get the test type form, but only the version that is current right now
    var options = {onDate: new Date()};
    var form = await Forms.retrieve('testForms', req.params.formId, options);
    
    if(!form)
    {
      return res.status(400).send("No such test form!");
    }
    
    // Render the single-component test page
    res.render('test_run_singleComponent.pug', {formId: req.params.formId,
                                                form,
                                                componentUuid: req.params.uuid});
  }
  catch(err)
  {
    logger.error(err);
    res.status(400).send(err.toString());
  }
});


// Run a test simultaneously on multiple components
router.get('/test/:formId/multiComponent', permissions.checkPermission("tests:submit"), async function(req, res, next)
{
  try
  {
    logger.info("Run a new multi-component test");
    
    // Get the test type form, but only the version that is current right now
    var options = {onDate: new Date()};
    var form = await Forms.retrieve('testForms', req.params.formId, options);
    
    if(!form)
    {
      return res.status(400).send("No such test form!");
    }
    
    // Render the multi-component test page
    res.render('test_run_multiComponent.pug', {formId: req.params.formId,
                                               form});
  }
  catch(err)
  {
    logger.error(err);
    res.status(400).send(err.toString());
  }
});


// Make a copy of a test and its results, and save the copy as a new draft
router.get('/test/:record_id([A-Fa-f0-9]{24})/copyToDraft', permissions.checkPermission("tests:submit"), async function(req, res, next)
{
  try
  {
    // Create the draft using the existing test and recorded results
    var newdraft = await Tests.copyToDraft(req.params.record_id, req);
    
    logger.info("Made copy ", newdraft);
    
    // Once the draft has been successfully created, redirect the user to the draft editing page
    if(newdraft) 
    {
      res.redirect('/draft/test/' + newdraft.toString())
    }
  }
  catch(err)
  {
    logger.error(err);
    res.status(400).send(err.toString());
  }
})


// Create a new test type form
var default_form_schema = JSON.parse(require('fs').readFileSync('dbSeed/default_form_schema.json'));

router.get('/tests/:formId/new', permissions.checkPermission("forms:edit"), async function(req, res)
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
  res.redirect('/tests/' + req.params.formId + '/edit');
});


// Edit an existing test type form
router.get('/tests/:formId?/edit', permissions.checkPermission("forms:edit"), async function(req, res)
{
  // Get a list of component types (since a particular test type must be associated with a component type)
  var componentTypes = await Components.getTypes();
  
  // Render the test type editing page
  res.render('edit_testTypeForm.pug', {collection: "testForms",
                                       componentTypes,
                                       formId: req.params.formId});
});


// List recently performed tests across all types
router.get('/tests/recent', permissions.checkPermission("tests:view"), async function(req, res, next)
{
  // Get a list of recently performed tests for a given test type (using the type form ID)
  // If the ID is not given, this gives a list of all recently performed tests across all types
  var tests = await Tests.listRecent(req.params.formId, (req.query || {}).N);
  
  // Render the page showing the list of tests
  res.render("list_tests.pug", {formId: req.params.formId,
                                tests: tests,
                                showType: true});
});


// Lists the test types
router.get('/tests/types', permissions.checkPermission("tests:view"), async function(req, res, next)
{
  // Get a list of all test type forms that exist
  var forms = await Forms.list('testForms');
  
  // Render the page showing the list of test types
  res.render("list_testTypes.pug", {forms});
});


// List recently performed tests of a single type
router.get('/tests/:formId?', permissions.checkPermission("tests:view"), async function(req, res, next)
{
  // Get a list of recently performed tests for a given test type (using the type form ID)
  // If the ID is not given, this gives a list of all recently performed tests across all types
  var tests = await Tests.listRecent(req.params.formId, (req.query || {}).N);
  
  // Render the page showing the list of tests
  res.render("list_tests.pug", {formId: req.params.formId,
                                tests: tests});
});

