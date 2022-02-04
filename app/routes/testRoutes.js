
'use strict';

const Components = require('lib/Components.js')('component');
const express = require('express');
const Forms = require('lib/Forms.js');
const permissions = require('lib/permissions.js');
const Tests = require('lib/Tests.js')('test');
const utils = require("lib/utils.js");

var router = express.Router();
module.exports = router;


// View the results of a single test
router.get('/test/:testId([A-Fa-f0-9]{24})', permissions.checkPermission("tests:view"), async function(req, res, next)
{
  try
  {
    // Retrieve the test's DB entry, using its test ID
    // Throw an error if there is no DB entry corresponding to this test ID
    var test = await Tests.retrieve(req.params.testId);

    if(!test)
    {
      return res.status(400).render("There is no DB entry for a test with ID: " + req.params.testId);
    }
    
    // Get the test's type form's ID
    // Throw an error if the form's ID cannot be found within the test's DB entry
    var formId = test.formId;
    
    if(!formId)
    {
      return res.status(400).send("This test (ID: " + req.params.testId + ") has no type form ID!");
    }

    // Retrieve a particular version of the test's type form, using its form ID and specified version number
    // If no version number is specified, the most recent version will be retrieved
    // Throw an error if there is no DB entry corresponding to this form ID
    var options = {};
    
    if(req.query.formVersion)
    {
      options.version = parseInt(req.query.formVersion);
    }
    
    var form = await Forms.retrieve('testForms', formId, options);
    
    if(!form)
    {
      return res.status(400).send("There is no DB entry for a test type form with ID: " + formId);
    }
    
    // Get the UUID of the component that the test was performed on
    var component = await Components.retrieve(test.componentUuid);
  
    // Render the page for viewing the results of a single test
    res.render('test.pug', {test,
                            form,
                            component})
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
  // Retrieve the test type form corresponding to the provided form ID
  var form = await Forms.retrieve('testForms', req.params.formId);
  
  // Render the page for running a test on a single unspecified component
  res.render('test_run_noComponent.pug', {formId: req.params.formId,
                                          form});
});


// Run a test on a single component with a specified component UUID
router.get('/test/:formId/' + utils.uuid_regex, permissions.checkPermission("tests:submit"), async function(req, res, next)
{
  try
  {
    // Retrieve the most recent version of the test type form corresponding to the provided form ID
    // Throw an error if there is no DB entry corresponding to this form ID
    var form = await Forms.retrieve('testForms', req.params.formId, {onDate: new Date()});
    
    if(!form)
    {
      return res.status(400).send("There is no DB entry for a test type form with ID: " + req.params.formId);
    }
    
    // Render the page for running a test on a single specified component
    res.render('test_run_singleComponent.pug', {form,
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
    // Retrieve the most recent version of the test type form corresponding to the provided form ID
    // Throw an error if there is no DB entry corresponding to this form ID
    var form = await Forms.retrieve('testForms', req.params.formId, {onDate: new Date()});
    
    if(!form)
    {
      return res.status(400).send("There is no DB entry for a test type form with ID: " + req.params.formId);
    }
    
    // Render the page for running a test simultaneously on multiple components
    res.render('test_run_multiComponent.pug', {form});
  }
  catch(err)
  {
    logger.error(err);
    res.status(400).send(err.toString());
  }
});


// Make a copy of a test and its results, and save the copy as a new draft test
router.get('/test/:testId([A-Fa-f0-9]{24})/copyToDraft', permissions.checkPermission("tests:submit"), async function(req, res, next)
{
  try
  {
    // Create the draft test using the existing test and results
    var newdraft = await Tests.copyToDraft(req.params.testId, req);
    
    // If the draft test has been successfully created, redirect the user to the page for editing a draft test
    if(newdraft) 
    {
      res.redirect('/test/draft/' + newdraft.toString());
    }
  }
  catch(err)
  {
    logger.error(err);
    res.status(400).send(err.toString());
  }
});


// List the current user's draft tests
router.get('/tests/myDrafts', async function(req, res, next)
{
  // Retrieve a list of the user's owned draft tests, using the user's ID
  // Note that a user 'owns' a draft if they were the one who originally submitted it
  var test_drafts = null;
  
  if(req.user && req.user.user_id)
  {
    test_drafts = await Tests.listUserDrafts(req.user.user_id);
  }
  
  // Render the page for viewing a list of the user's draft tests
  res.render('list_draftTests.pug', {test_drafts});
});


// Edit an existing draft test
router.get('/test/draft/:testId([A-Fa-f0-9]{24})', permissions.checkPermission("tests:submit"), async function(req, res, next)
{
  try
  {
    // Retrieve the draft test's DB entry, using its test ID
    // Throw and error if there is no DB entry corresponding to this test ID
    var test = await Tests.retrieve(req.params.testId);
    
    if(!test)
    {
      return res.status(400).render("There is no DB entry for a draft test with ID: " + req.params.testId);
    }
    
    // Inform the user if the provided test ID does not correspond to a draft
    // This could happen if the test was in fact submitted, but has somehow also still remained in its original draft state in the DB
    if(test.state != "draft")
    {
      return res.status(400).send("This test (ID: " + req.params.testId + ") is not a draft!");
    }
    
    // Get the draft test's type form's ID
    // Throw an error if the form's ID cannot be found within the draft test's DB entry
    var formId = test.formId;
    
    if(!formId)
    {
      return res.status(400).send("This draft test (ID: " + req.params.testId + ") has no type form ID!");
    }

    // Retrieve the test's type form, using its form ID
    // Throw an error if there is no DB entry corresponding to this form ID
    var form = await Forms.retrieve('testForms', formId);
    
    if(!form)
    {
      return res.status(400).send("There is no DB entry for a test type form with ID: " + formId);
    }
    
    // Render the page for running a test on a single component (i.e. continue to run this test on the same component)
    res.render('test_run_singleComponent.pug', {test,
                                                formId,
                                                form,
                                                componentUuid: test.componentUuid});
  }
  catch(err)
  {
    logger.error(err);
    res.status(400).send(err.toString());
  }
});


// Delete an existing draft test
router.get('/test/draft/:testId([A-Fa-f0-9]{24})/delete', permissions.checkPermission("tests:submit"), async function(req, res, next)
{
  try
  {
    // Retrieve the draft test's DB entry, using its test ID
    // Throw an error if there is no DB entry corresponding to this test ID
    var test = await Tests.retrieve(req.params.testId);
    
    if(!test)
    {
      return res.status(400).render("There is no DB entry for a draft test with ID: " + req.params.testId);
    }
    
    // Inform the user if the provided ID does not correspond to a draft
    // This could happen if the test was in fact submitted, but has somehow also still remained in its original draft state in the DB
    if(test.state != "draft")
    {
      return res.status(400).send("This test (ID: " + req.params.testId + ") is not a draft!");
    }
    
    // Check that the draft test is actually owned by the user (users can only view and delete their own drafts, not those of other users)
    if(test.insertion.user.user_id != req.user.user_id)
    {
      return res.status(400).send("You do not have permission to delete this draft test - you did not originally submit it!");
    }
    
    // Delete the draft test
    await Tests.deleteDraft(req.params.testId);
    
    // Redirect the user back to the page for viewing a list of the user's drafts
    res.redirect('/tests/drafts');
  }
  catch(err)
  {
    logger.error(err);
    res.status(400).send(err.toString());
  }
});


// Create a new test type form
var default_form_schema = JSON.parse(require('fs').readFileSync('./schemas/default_form_schema.json'));

router.get('/tests/:formId/new', permissions.checkPermission("forms:edit"), async function(req, res)
{
  // Retrieve any and all existing test type forms with the same form ID as the one provided
  var form = await Forms.retrieve("testForms", req.params.formId);
  
  // If there is no existing test type form with the same ID, set up a new one using the ID and the default form schema
  // Initially, use the form ID as the form name as well - the user will have the option of changing the name later
  if(!form)
  {
    var form = {formId: req.params.formId,
                formName: req.params.formId,
                schema: default_form_schema}; 

    Forms.save(form, 'testForms', req);
  }

  // Redirect the user to the page for editing an existing test type form
  res.redirect('/tests/' + req.params.formId + '/edit');
});


// Edit an existing test type form
router.get('/tests/:formId?/edit', permissions.checkPermission("forms:edit"), async function(req, res)
{
  // Retrieve a list of all component types (since a particular test type must be associated with one or more component type)
  var componentTypes = await Components.getTypes();
  
  // Render the page for editing an existing test type form
  res.render('edit_testTypeForm.pug', {collection: "testForms",
                                       componentTypes,
                                       formId: req.params.formId});
});


// Lists the test types
router.get('/tests/types', permissions.checkPermission("tests:view"), async function(req, res, next)
{
  // Retrieve a list of all test type forms that currently exist
  var forms = await Forms.list('testForms');
  
  // Render the page for listing all test types
  res.render("list_testTypes.pug", {forms});
});


// List recently performed tests across all types
router.get('/tests/recent', permissions.checkPermission("tests:view"), async function(req, res, next)
{
  // Retrieve a list of performed tests across all test types (since no type form ID is given)
  // Set a limit on the number of displayed tests (otherwise every single one in the DB will be shown!)
  var tests = await Tests.listRecent(null, 30);
  
  // Render the page for showing a generic list of tests
  res.render("list_tests.pug", {tests,
                                singleType: false});
});


// List recently performed tests of a single type
router.get('/tests/:formId?', permissions.checkPermission("tests:view"), async function(req, res, next)
{
  // Retrieve a list of performed tests with the provided test type form ID
  // Set a limit on the number of displayed tests (otherwise every single one in the DB will be shown!)
  var tests = await Tests.listRecent(req.params.formId, 50);
  
  // Retrieve the test type form corresponding to the provided form ID
  var form = await Forms.retrieve('testForms', req.params.formId);
  
  // Render the page for showing a generic list of tests
  res.render("list_tests.pug", {tests,
                                singleType: true,
                                form});
});

