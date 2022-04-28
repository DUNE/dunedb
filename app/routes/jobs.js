
const express = require('express');
const Forms = require('lib/Forms.js');
const Jobs = require('lib/Jobs.js')('job');
const logger = require('../lib/logger');
const permissions = require('lib/permissions.js');

var router = express.Router();
module.exports = router;


// View information about an existing job
router.get('/job/:jobId([A-Fa-f0-9]{24})', permissions.checkPermission("jobs:view"), async function(req, res, next)
{
  try
  {
    // Set up a query for both the DB entry's job ID and (optionally) version to match those provided
    var query = {jobId: req.params.jobId};
    
    if(req.query.version)
    {
      query["validity.version"] = parseInt(req.query.version);
    }
    
    // Retrieve the job's DB entry, using its job ID, and all versions of the job as well
    // Throw an error if there is no DB entry corresponding to this job ID
    let [job, jobVersions] = await Promise.all(
    [
      Jobs.retrieve(query),
      Jobs.versions(req.params.jobId)
    ]);
    
    if(!job)
    {
      return res.status(400).send("There is no DB entry for a job with ID: " + req.params.jobId);
    }
    
    // Get the job's type form's ID
    // Throw an error if the form's ID cannot be found within the job's DB entry
    var formId = job.formId;
    
    if(!formId)
    {
      return res.status(400).send("This job (ID: " + req.params.jobId + ") has no type form ID!");
    }
    
    // Retrieve a particular version of the job's type form, using its form ID and specified version number
    // If no version number is specified, the most recent version will be retrieved
    // Throw an error if there is no DB entry corresponding to this form ID
    var options = {};
    
    if(req.query.formVersion)
    {
      options.version = parseInt(req.query.formVersion);
    }
    
    var form = await Forms.retrieve('jobForms', formId, options);
    
    if(!form)
    {
      return res.status(400).send("There is no DB entry for a job type form with ID: " + formId);
    }
    
    // Render the page for viewing the information about an existing job
    res.render('job.pug', {job,
                           jobVersions,
                           form})
  } 
  catch(err)
  {
    logger.error(err);
    res.status(400).send(err.toString());
  }
});


// Submit a new job of a given type
router.get('/job/:formId', permissions.checkPermission("jobs:submit"), async function(req, res, next)
{
  try
  {
    // Retrieve the job type form corresponding to the specified form ID
    // Set the retrieval (and therefore, submission) timestamp to be the current date and time
    // Throw an error if there is no DB entry corresponding to this form ID
    var form = await Forms.retrieve('jobForms', req.params.formId, {onDate: new Date()});
    
    if(!form)
    {
      return res.status(400).send("There is no DB entry for a job type form with ID: " + req.params.formId);
    }
    
    // Render the page for submitting a new job
    res.render('job_submit.pug', {form});
  }
  catch(err)
  {
    logger.error(err);
    res.status(400).send(err.toString());
  }
});


// Edit an existing job
router.get('/job/:jobId([A-Fa-f0-9]{24})/edit', permissions.checkPermission("jobs:submit"), async function(req, res, next)
{
  try
  {
    // Retrieve the job's DB entry, using its job ID
    // Throw an error if there is no DB entry corresponding to this job ID
    var job = await Jobs.retrieve(req.params.jobId);
    
    if(!job)
    {
      next();
    }
    
    // Get the job's type form's ID
    // Throw an error if the form's ID cannot be found within the job's DB entry
    var formId = job.formId;
    
    if(!formId)
    {
      return res.status(400).send("This job (ID: " + req.params.jobId + ") has no type form ID!");
    }
    
    // Retrieve the job's type form, using its form ID
    // Throw an error if there is no DB entry corresponding to this form ID
    var form = await Forms.retrieve('jobForms', job.formId);
    
    if(!form)
    {
      return res.status(400).send("There is no DB entry for a job type form with ID: " + formId);
    }
    
    // Render the page for submitting a new job
    // The same page can be used to edit an existing job, since it is effectively just a 'new' job with the same ID, and information already filled in
    res.render('job_submit.pug', {job,
                                  form});
  }
  catch(err)
  {
    logger.error(err);
    res.status(400).send(err.toString());
  }
});


// Create a new job type form
var default_form_schema = JSON.parse(require('fs').readFileSync('./schemas/default_form_schema.json'));

router.get('/jobs/:formId/new', permissions.checkPermission("forms:edit"), async function(req, res)
{
  // Retrieve any and all existing job type forms with the same form ID as the one provided
  var form = await Forms.retrieve("jobForms", req.params.formId);
  
  // If there is no existing job type form with the same ID, set up a new one using the ID and the default form schema
  // Initially, use the form ID as the form name as well - the user will have the option of changing the name later
  if(!form)
  {
    var form = {formId: req.params.formId,
                formName: req.params.formId,
                schema: default_form_schema}; 
    
    Forms.save(form, 'jobForms', req);
  }
  
  // Redirect the user to the page for editing an existing job type form
  res.redirect('/jobs/' + req.params.formId + '/edit');
});


// Edit an existing job type form
router.get('/jobs/:formId/edit', permissions.checkPermission("forms:edit"), async function(req, res)
{
  // Render the page for editing an existing job type form
  res.render('edit_jobTypeForm.pug', {collection: "jobForms",
                                      formId: req.params.formId});
});


// List all job types
router.get('/jobs/types', permissions.checkPermission("jobs:view"), async function(req, res, next)
{
  // Retrieve a list of all job type forms that currently exist
  var forms = await Forms.list('jobForms');
  
  // Render the page for listing all job types
  res.render('list_jobTypes.pug', {forms});
});


// List recently submitted jobs across all types
router.get('/jobs/recent', permissions.checkPermission("jobs:view"), async function(req, res, next)
{
  // Retrieve a list of submitted jobs across all job types (since no type form ID is given)
  // Set a limit on the number of displayed jobs (otherwise every single one in the DB will be shown!)
  var jobs = await Jobs.list(null, {limit: 30});
  
  // Render the page for showing a generic list of jobs
  res.render('list_jobs.pug', {jobs,
                               singleType: false,
                               title: "Recently Submitted Jobs (All Types)"});
});


// List recently submitted jobs of a single type
router.get('/jobs/:formId/list', permissions.checkPermission("jobs:view"), async function(req, res, next)
{
  // Construct the 'match conditions' to be passed to the function that retrieves a list of jobs
  // For this, it is simply the requirement that the job type form ID must match the provided one
  var match = (req.params.formId) ? {formId: req.params.formId} : {};
  
  // Retrieve a list of submitted jobs with a matching type form ID
  // Set a limit on the number of displayed jobs (otherwise every single one in the DB will be shown!)
  var jobs = await Jobs.list(match, {limit: 50});
  
  // Retrieve the job type form corresponding to the provided form ID
  var form = await Forms.retrieve('jobForms', req.params.formId);
  
  // Render the page for showing a generic list of jobs
  res.render('list_jobs.pug', {jobs,
                               singleType: true,
                               title: "Recently Submitted Jobs (Single Type)",
                               form});
});

