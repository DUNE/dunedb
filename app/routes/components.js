
const Components = require('lib/Components.js')('component');
const Courses = require('lib/Courses.js');
const express = require('express');
const Forms = require('lib/Forms.js');
const Jobs = require("lib/Jobs.js")('job');
const logger = require('../lib/logger');
const permissions = require('lib/permissions.js');
const shortuuid = require('short-uuid')();
const Tests = require('lib/Tests.js')('test');
const utils = require("lib/utils.js");

var router = express.Router();
module.exports = router;


// View information about an existing component
router.get('/component/' + utils.uuid_regex, permissions.checkPermission("components:view"), async function(req, res, next)
{
  try
  {
    // If there is no user currently logged in, immediately exit
    // An active login is required in order to add the component to the list of the user's recently viewed components
    if(!req.session)
    {
      return res.status(404).send("Please log in to access this page!");
    }
    
    // Set up a query for both the DB entry's component ID and (optionally) version to match those provided
    var query = {componentUuid: req.params.uuid};
    
    if(req.query.version)
    {
      query["validity.version"] = parseInt(req.query.version);
    }
    
    // Retrieve the component's DB entry, using its UUID, and all versions of the component as well
    // Throw an error if there is no DB entry corresponding to this UUID
    let [component, componentVersions] = await Promise.all(
    [
      Components.retrieve(query),
      Components.versions(req.params.uuid)
    ]);
    
    if(!component)
    {
      return res.status(400).send("There is no DB entry for a component with UUID: " + req.params.uuid);
    }
    
    // Get the component's type form's ID
    // Throw an error if the form's ID cannot be found within the component's DB entry
    var formId = component.formId;
    
    if(!formId)
    {
      return res.status(400).send("This component (UUID: " + req.params.uuid + ") has no type form ID!");
    }
    
    // Get any other information relating to this component ... this includes the following:
    //  - the component's type form, using its form ID
    //  - the results of tests that have already been performed on this component
    //  - all currently available test type forms
    //  - any related components
    // Throw an error if there is no DB entry corresponding to this form ID
    let [form, tests, testForms, relatedComponents] = await Promise.all(
    [
      Forms.retrieve("componentForms", formId),
      Tests.listComponentTests(req.params.uuid),
      Forms.list(),
      Components.relationships(req.params.uuid)
    ]);
    
    if(!form)
    {
      return res.status(400).send("There is no DB entry for a component type form with ID: " + formId);
    }
    
    // Add the component to the list of the user's recently viewed components
    req.session.recent = req.session.recent || {};
    req.session.recent['componentUuid'] = req.session.recent['componentUuid'] || [];
    
    var list = req.session.recent['componentUuid'];
    var i = list.indexOf(req.params.uuid);
    
    if(i > -1)
    {
      list.splice(i, 1);
    }
    
    list.unshift(req.params.uuid);
    
    // Render the page for viewing the information about an existing component
    res.render("component.pug", {component,
                                 componentVersions,
                                 form,
                                 tests,
                                 testForms,
                                 relatedComponents});
  }
  catch(err)
  {
    logger.error(err);
    res.status(400).send(err.toString());
  }
});


// A shortened URL is coded into the component QR code, instead of the full URL of the component information page
// Redirect the shortened URL to the full URL
router.get('/c/' + utils.short_uuid_regex, async function(req, res, next)
{
  // Reconstruct the full UUID from the shortened UUID
  var componentUuid = shortuuid.toUUID(req.params.shortuuid);
  
  // Redirect the user to the page for viewing the information about the component with this full UUID
  res.redirect('/component/' + componentUuid);
});


// View and print a set of a component's QR codes
router.get('/component/' + utils.uuid_regex + '/qrCodes', permissions.checkPermission("components:view"), async function(req, res, next)
{
  // Retrieve the component's DB entry, using its UUID
  // Throw an error if there is no DB entry corresponding to this UUID
  var component = await Components.retrieve(req.params.uuid);
  
  if(!component)
  {
    return res.status(400).send("There is no DB entry for a component with UUID: " + req.params.uuid);
  }
  
  // Render the page for viewing and printing a set of a component's QR codes
  res.render('component_qrCodes.pug', {component});
});


// View and print a component's summary
router.get('/component/' + utils.uuid_regex + '/summary', permissions.checkPermission("components:view"), async function(req, res, next)
{
  // First retrieve information related to the component from the 'components' and 'tests' sections of the DB:
  //  - information about the component itself
  //  - information about tests that have been performed on the component
  
  let [component, tests] = await Promise.all(
  [
    Components.retrieve(req.params.uuid),
    Tests.getRecentComponentTests(req.params.uuid)
  ]);
  
  // Next, get information about the course that this component's type relates to (if one exists)
  var courseId = await Courses.getCourseForComponentType(component.formId);
  
  // If there is a course relating to this component type, evaluate it via its ID
  // Then check the course steps, and get information about all steps that are 'jobs'
  var evaluatedCourse = null;
  var jobs = [];
  
  if(courseId)
  {
    evaluatedCourse = await Courses.evaluate(courseId, req.params.uuid);

    var courseJobs = [];
    
    for(var step of evaluatedCourse.evaluation)
    {
      if(step.type == "job")
      {
        if(step.result.length > 0)
        {
          courseJobs.push(step.result[0]);
        }
      }
    }
    
    var jobPromises = [];
    
    for(var job of courseJobs)
    {
      jobPromises.push(Jobs.retrieve(job.jobId))
    }
    
    jobs = await Promise.all(jobPromises);
  }
  
  // Gather all of the retrieved data into a single 'records' entity
  var records = [component];
  
  records.push(...tests);
  records.push(...jobs);
  
  if(evaluatedCourse)
  {
    records.push(evaluatedCourse);
  }
  
  // Render the page for viewing and printing a component's summary
  res.render("component_summary.pug", {component,
                                       records});
});


// Create a new component of a given type
router.get('/component/:formId', permissions.checkPermission("components:edit"), async function (req, res, next)
{
  try
  {
    // Retrieve the component type form corresponding to the specified form ID
    // Set the retrieval (and therefore, submission) timestamp to be the current date and time
    // Throw an error if there is no DB entry corresponding to this form ID
    var form = await Forms.retrieve("componentForms", req.params.formId, {onDate: new Date()});
    
    if(!form)
    {
      return res.status(400).send("There is no DB entry for a component type form with ID: " + req.params.formId);
    }
    
    // Generate a new full UUID
    var componentUuid = Components.newUuid();
    var formId = req.params.formId;
    
    // Render the page for editing an existing component
    res.render("edit_component.pug", {componentUuid,
                                      component: {componentUuid, formId},
                                      form,
                                      newComponent: true});
  }
  catch(err)
  {
    logger.info(err);
    res.status(400).send(err.toString());
  }
});


// Edit an existing component
router.get('/component/' + utils.uuid_regex + '/edit', permissions.checkPermission("components:edit"), async function(req, res, next)
{
  try
  {
    // Retrieve the component's DB entry, using its UUID
    // Throw an error if there is no DB entry corresponding to this UUID
    var component = await Components.retrieve(req.params.uuid);
  
    if(!component)
    {
      return res.status(400).send("There is no DB entry for a component with UUID: " + req.params.uuid);
    }
    
    // Get the component's type form's ID
    // Throw an error if the form's ID cannot be found within the component's DB entry
    var formId = component.formId;
    
    if(!formId)
    {
      return res.status(400).send("This component (UUID: " + req.params.uuid + ") has no type form ID!");
    }
    
    // Retrieve the component's type form, using its form ID
    // Throw an error if there is no DB entry corresponding to this form ID
    var form = await Forms.retrieve("componentForms", formId);
    
    if(!form)
    {
      return res.status(400).send("There is no DB entry for a component type form with ID: " + formId);
    }
    
    // Render the page for editing an existing component
    res.render("edit_component.pug", {componentUuid: req.params.uuid,
                                      component,
                                      form,
                                      newComponent: false});
  }
  catch(err)
  {
    logger.error(err);
    res.status(400).send(err.toString());
  }
});


// Create a new component type form
var default_form_schema = JSON.parse(require('fs').readFileSync('schemas/default_form_schema.json'));

router.get('/components/:formId/new', permissions.checkPermission("forms:edit"), async function (req, res)
{
  try
  {
    // Retrieve any and all existing component type forms with the same form ID as the one provided
    var form = await Forms.retrieve("componentForms", req.params.formId);
  
    // If there is no existing component type form with the same ID, set up a new one using the ID and the default form schema
    // Initially, use the form ID as the form name as well - the user will have the option of changing the name later
    if(!form)
    {
      var form = {formId: req.params.formId,
                  formName: req.params.formId,
                  schema: default_form_schema};
      
      Forms.save(form, 'componentForms', req);
    }
    
    // Redirect the user to the page for editing an existing component type form
    res.redirect('/components/' + req.params.formId + '/edit');
  }
  catch (err)
  {
    logger.info(err);
    res.status(400).send(err.toString());
  }
});


// Edit an existing component type form
router.get('/components/:formId/edit', permissions.checkPermission("forms:edit"), async function (req, res)
{
  // Render the page for editing an existing component type form
  res.render('edit_componentTypeForm.pug', {collection: "componentForms",
                                            formId: req.params.formId});
});


// List all component types
router.get('/components/types', permissions.checkPermission("components:view"), async function(req, res, next)
{
  // Retrieve a list of all component type forms that currently exist
  var forms = await Forms.list('componentForms');
  
  // Render the page for listing all component types
  res.render("list_componentTypes.pug", {forms});
});


// List recently created and edited components across all types
router.get('/components/recent', permissions.checkPermission("components:view"), async function(req, res, next)
{
  // Retrieve a list of created and edited components across all component types (since no type form ID is given)
  // Set a limit on the number of displayed components (otherwise every single one in the DB will be shown!)
  var components = await Components.list(null, {limit: 30});

  // Render the page for showing a generic list of components
  res.render("list_components.pug", {components,
                                     singleType: false,
                                     title: "Recent Components (All Types)"});
});


// List the current user's recently visited components
router.get('/components/myRecents', async function(req, res, next)
{
  // Set up a list to hold the user's recently visited components
  var recentComponents = [];
  
  // If there is an active user login ...
  if(((req.session || {}).recent || {}).componentUuid)
  {
    // Construct the 'match conditions' to be passed to the function that retrieves a list of components
    // For this, it is that a component's UUID must be in the list of UUIDs that the user has recently visited (via the corresponding component information page)
    var match = {componentUuid: {$in:req.session.recent.componentUuid}}
    
    // Retrieve a list of components matching the condition set above
    // Set a limit on the number of displayed components 
    var componentList = await Components.list(match, {limit: 50});
    
    // Order and save the list
    for(var c of req.session.recent.componentUuid)
    {
      recentComponents.push(componentList.find(element => element.componentUuid == c));
    }
  }
  
  // Render the page for showing a generic list of components
  res.render("list_components.pug", {components: recentComponents,
                                     singleType: false,
                                     title: "My Recently Visited Components"});
});


// List recently created and edited components of a single type
router.get('/components/:formId/list', permissions.checkPermission("components:view"), async function(req, res, next)
{
  // Construct the 'match conditions' to be passed to the function that retrieves a list of components
  // For this, it is simply the requirement that the component type form ID must match the provided one
  var match = (req.params.formId) ? {formId: req.params.formId} : {};
  
  // Retrieve a list of created and edited components with a matching type form ID
  // Set a limit on the number of displayed components (otherwise every single one in the DB will be shown!)
  var components = await Components.list(match, {limit: 50});
  
  // Retrieve the component type form corresponding to the provided form ID
  var form = await Forms.retrieve('componentForms', req.params.formId);
  
  // Render the page for showing a generic list of components
  res.render("list_components.pug", {components,
                                     singleType: true,
                                     title: "Recent Components (Single Type)",
                                     form});
});


// Search for a specific component using a UUID
// Keep this route in this file, rather than 'searchRoutes.js', so that it doesn't conflict with the other search route (they both template as '/search/<text>')
router.get('/search/componentsByUUID', async function(req, res, next)
{
  // Render the page for searching for a component via its UUID
  res.render("search_componentsByUUID.pug");
});

