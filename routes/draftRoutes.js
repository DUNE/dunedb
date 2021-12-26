
'use strict';

const express = require('express');
const Forms = require('lib/Forms.js');
const permissions = require('lib/permissions.js');
const Tests = require('lib/Tests.js')('test');

var router = express.Router();
module.exports = router;


// View a list of the user's drafts
router.get('/user/drafts', async function(req, res, next)
{
  // Get lists of the user's owned drafts from all sources, using the user's ID
  // Note that a user 'owns' a draft if they were the one who originally submitted it
  var test_drafts = null;
  
  if(req.user && req.user.user_id)
  {
    test_drafts = await Tests.listUserDrafts(req.user.user_id);
  }
  
  // Render the page for viewing a list of the user's drafts
  res.render('list_drafts.pug', {test_drafts});
});


// Edit an existing draft test
router.get('/draft/test/:testId([A-Fa-f0-9]{24})', permissions.checkPermission("tests:submit"), async function(req, res, next)
{
  try
  {
    // Retrieve the draft test's DB entry, using its test ID
    // If there is no DB entry corresponding to this test ID, just move on
    var test = await Tests.retrieve(req.params.testId);
    
    if(!test)
    {
      next();
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
    res.render('test_run_singleComponent.pug', {testdata: test,
                                                formId,
                                                form,
                                                componentUuid: test.componentUuid});
  }
  catch(err)
  {
    res.status(400).send(err.toString());
  }
});


// Delete an existing draft test
router.get('/draft/test/:testId([A-Fa-f0-9]{24})/delete', permissions.checkPermission("tests:submit"), async function(req, res, next)
{
  try
  {
    // Retrieve the draft test's DB entry, using its test ID
    // If there is no DB entry corresponding to this test ID, just move on
    var test = await Tests.retrieve(req.params.testId);
    
    if(!test)
    {
      next();
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
    res.redirect('/user/drafts');
  }
  catch(err)
  {
    res.status(400).send(err.toString());
  }
});


