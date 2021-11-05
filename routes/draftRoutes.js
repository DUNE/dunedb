'use strict';

// General pug requirements
const chalk = require('chalk');
const express = require('express');

// Local Javascript libraries
const Jobs = require('lib/Jobs.js')('job');
const Forms = require('lib/Forms.js');
const permissions = require('lib/permissions.js');
const Tests = require('lib/Tests.js')('test');

var router = express.Router();
module.exports = router;


// View a list of the user's draft tests and jobs
router.get('/user/drafts', permissions.checkPermission("tests:view"), async function(req, res, next)
{
  // Get lists of the user's test and job drafts
  var test_drafts = null;
  var job_drafts = null;
  
  if(req.user && req.user.user_id)
  {
    test_drafts = await Tests.listUserDrafts(req.user.user_id);
    job_drafts = await Jobs.listUserDrafts(req.user.user_id);
  }
  
  // Render the page showing the list of drafts
  res.render('list_drafts.pug', {test_drafts,
                                 job_drafts});
});


// Edit an existing test draft
router.get('/draft/test/:record_id([A-Fa-f0-9]{24})', permissions.checkPermission("tests:submit"), async function(req, res, next)
{
  try
  {
    logger.info("Resume editing draft", req.params.record_id);
    
    // Get the draft test record
    var testdata = await Tests.retrieve(req.params.record_id);
    
    if(!testdata)
    {
      next();
    }
    
    if(testdata.state != "draft")
    {
      return res.status(400).send("Data is not a draft");
    }
    
    logger.info(testdata);
    
    if(!testdata.formId)
    {
      return res.status(400).send("Cannot find test data with form ID:" + testdata.formId);
    }

    // Get the test type form associated with the given form ID
    var form = await Forms.retrieve('testForms',testdata.formId);
    
    if(!form)
    {
      return res.status(400).send("This form ID does not correspond to an existing test type form!");
    }
    
    // Render the single-component test page
    res.render('test_run_singleComponent.pug', {formId: testdata.formId,
                                                form: form,
                                                componentUuid: testdata.componentUuid,
                                                testdata: testdata});
  }
  catch(err)
  {
    logger.error(err);
    res.status(400).send(err.toString());
  }
});


// Delete an existing test draft
router.get('/draft/test/:record_id([A-Fa-f0-9]{24})/delete', permissions.checkPermission("tests:submit"), async function(req, res, next)
{
  try
  {
    logger.info("Delete draft test", req.params.record_id);
    
    // Get the draft test record
    var testdata = await Tests.retrieve(req.params.record_id);
    
    if(!testdata)
    {
      next();
    }
    
    if(testdata.state != "draft")
    {
      return res.status(400).send("Data is not a draft");
    }
    
    if(testdata.insertion.user.user_id != req.user.user_id)
    {
      return res.status(400).send("You do not have permission to delete this test draft - you are not the draft owner");
    }

    await Tests.deleteDraft(req.params.record_id);
    
    // Redirect back to the main (and updated) drafts page
    var backURL = req.header('Referer') || '/';
    res.redirect(backURL);
  }
  catch(err)
  {
    logger.error(err);
    res.status(400).send(err.toString());
  }
});

