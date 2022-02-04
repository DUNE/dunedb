
const Components = require('lib/Components.js');
const ComponentTypes = require('lib/ComponentTypes.js');
const Courses = require('lib/Courses.js');
const deepmerge = require('deepmerge');
const express = require('express');
const Forms = require('lib/Forms.js');
const Jobs = require("lib/Jobs.js")();
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
    
    // Get the component's type form's name
    // Throw an error if the form's name cannot be found within the component's DB entry
    var formName = component.type;
    
    if(!formName)
    {
      return res.status(400).send("This component (UUID: " + req.params.uuid + ") has no type form name!");
    }
    
    // Get any other information relating to this component ... this includes the following:
    //  - the component's type form, using its form name
    //  - the results of tests that have already been performed on this component
    //  - all currently available test type forms
    //  - any related components
    // Throw an error if there is no DB entry corresponding to this form name
    let [form, tests, testForms, relatedComponents] = await Promise.all(
    [
      Forms.retrieve("componentForms", formName),
      Tests.listComponentTests(req.params.uuid),
      Forms.list(),
      Components.relationships(req.params.uuid)
    ]);
    
    if(!form)
    {
      return res.status(400).send("There is no DB entry for a component type form with name: " + formName);
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





// View the label of a single component
router.get('/component/' + utils.uuid_regex + '/label', permissions.checkPermission("components:view"), async function(req, res, next)
{
  // Retrieve the component's DB entry, using its UUID
  // Throw an error if there is no DB entry corresponding to this UUID
  var component = await Components.retrieve(req.params.uuid);
  
  if(!component)
  {
    return res.status(400).send("There is no DB entry for a component with UUID: " + req.params.uuid);
  }
  
  // Render the page for viewing the label of a single component
  res.render('component_label.pug', {component});
});


// View the traveller of a single component
router.get('/component/' + utils.uuid_regex + '/traveller/', permissions.checkPermission("components:view"), async function(req, res, next)
{
  // Get the component from the given (full or shortened) UUID
  var componentUuid = (req.params.uuid) || shortuuid.toUUID(req.params.shortuuid);
  
  // Get the component's information from all possible sources - component, type, tests, jobs and courses
  Courses.getCourseForComponentType()
  
  let [component, tests] = await Promise.all(
  [
    Components.retrieve(componentUuid),
    Tests.getRecentComponentTests(componentUuid)
  ]);

  var courseId = await Courses.getCourseForComponentType(component.type);
  var evaluatedCourse = null;
  var jobs = [];

//  console.log("courseId", courseId)

  if(courseId)
  {
    evaluatedCourse = await Courses.evaluate(courseId, componentUuid);

    var jobs = [];
    
    for(var step of evaluatedCourse.evaluation)
    {
      if(step.type == "job")
        if(step.result.length > 0)
          jobs.push(step.result[0]);
    }

    var jobPromises = [];
    
//    console.log("jobs",jobs);

    for(var job of jobs)
      jobPromises.push(Jobs.retrieve(job.jobId))
    
    jobs = await Promise.all(jobPromises);
  }
  
  var records = [component];
  
  if(evaluatedCourse) records.push(evaluatedCourse);
  records.push(...tests);
  records.push(...jobs);

//  console.log(records);

  // Render the component traveller page
  res.render("component_traveller.pug", {component,
                                         componentUuid,
                                         records});
});






// Contact sheet of new unregistered components
router.get("/NewComponentContactSheet/:type?",permissions.checkPermission("components:create"),
  async function(req,res,next){
    var components = [];
    for(var i=0;i<15;i++) {
      components.push(
      {
        componentUuid: Components.newUuid(),
        data: {
        // name: ""
        },
      })
    }
    res.render("contact_sheet.pug",{components});

  }
);






// Create a new component of a specified type
// Note that you cannot create a new component without FIRST specifying the type
router.get('/component/new/:type', permissions.checkPermission("components:create"), async function (req, res)
{
  try
  {
    // Get the component type and associated type form
    // If no form exists for the specified component type, throw an error
    var type = decodeURIComponent(req.params.type);
    var form = await Forms.retrieve("componentForms", type);
    
    if(!form) return res.status(400).send("No such type: " + type);
    
    // Produce a new UUID
    var componentUuid = Components.newUuid();
    
    // Render the component editing page (this is the same page template that is used for creating a new component)
    res.render("edit_component.pug", {schema: form.schema,
                                      componentUuid: componentUuid,
                                      component: {type: type,
                                                  componentUuid: componentUuid},
                                      canEdit: permissions.hasPermission("components:edit"),
                                      tests: [],
                                      performed: []});
  }
  catch(err)
  {
    logger.info(err);
    res.status(400).send(err.toString());
  }
});


// Edit an existing component
async function edit_component(req, res)
{
  // Get the component from the given (full or shortened) UUID
  var componentUuid = (req.params.uuid) || shortuuid.toUUID(req.params.shortuuid);
//  logger.info(get_component, componentUuid, req.params);

  var component = await Components.retrieve(componentUuid);
  
  // If the component or associated type doesn't exist, that's fine
  // Just get set up for creating a new component instead (is the same page as is used for editing an existing one anyway)
  if(!component || !component.type)
  {
    component = {componentUuid: componentUuid};
  }
  
  // Render the component editing page
  res.render("edit_component.pug", {componentUuid: componentUuid,
                                    component: component});
}

// The component editing page can be accessed by either the full or shortened UUID
router.get('/component/' + utils.uuid_regex + '/edit', permissions.checkPermission("components:edit"), edit_component);
router.get('/component/' + utils.short_uuid_regex + '/edit', permissions.checkPermission("components:edit"), edit_component);


// [Internal Function] Make sure that a component type form already exists for the component type being requested
var automaticallyCreateSchema =  require('lib/automaticallyCreateSchema.js');

async function ensureTypeFormExists(type, req, res)
{
  var form = await Forms.retrieve("componentForms", type);
  
  if(!form)
  {
    
    var newform = {formId: type,
                   formName: type};

    // Do any components already exist for this type?  If not, let's do automagic!
    var exists = await Components.list({type: type}, {limit: 20});
    logger.info(exists, "exists");
    
    if(exists && exists.length > 0)
    {
        var records = [];
        
        for(var c of exists)
        {
          records.push(await Components.retrieve(c.componentUuid));
        }
        
        var auto = automaticallyCreateSchema(records);
        newform.schema = auto;
        logger.info(auto, "Creating a new auto form ...");
    }
    else
    {
      // Create a blank component type form
      newform.schema = {components: [{"label": "Name",
                                      "placeholder": "example: apa 10",
                                      "tooltip": "Human readable and searchable identifier or nickname. This field is required for all types. It may be calculated.",
                                      "tableView": true,
                                      "key": "name",
                                      "type": "textfield",
                                      "validate": {"required": true},
                                      "input": true}]}
      
      logger.info("Creating a new blank component type form ...")
    }
    
    await Forms.save(newform, "componentForms", req);
  }
}

// Create a new component type form
router.get('/components/:type/new', permissions.checkPermission("forms:edit"), async function (req, res)
{
  try
  {
    var type = decodeURIComponent(req.params.type);
    
    // Even when creating a new component type, we still need to check if the type's form already exists
    await ensureTypeFormExists(type, req, res);
    
    // Render the component type editing page (this is the same page template that is used for creating a new component type)
    res.render('edit_componentTypeForm.pug', {collection: "componentForms",
                                              formId: type});
  }
  catch (err)
  {
    logger.info(err);
    res.status(400).send(err.toString());
  }
});

// Edit an existing component type form
router.get('/components/:type/edit/:auto(auto)?', permissions.checkPermission("forms:edit"), async function (req, res)
{
  var type = decodeURIComponent(req.params.type);
  
  // Check if the requested component type's form exists
  if(req.params.auto == "auto")
  {
    await ensureTypeFormExists(type, req, res);
  }
  
  // Render the component type editing page
  res.render('edit_componentTypeForm.pug', {collection: "componentForms",
                                            formId: type});
});


// List recently edited or created components of all types
router.get('/components/recent', permissions.checkPermission("components:view"), async function(req, res, next)
{
  // Get a list of the (first 30) components, ordered by last modified
  var components = await Components.list(null, {limit: 30});

  // Get a list of any component types that exist but haven't been used to create any actual components yet
  var forms = await Forms.list('componentForms');

//  logger.info(components);

  // Render the page showing the list of components
  res.render("list_components.pug", {forms,
                                     components,
                                     title: "All Recently Edited/Created Components",
                                     showType: true});
});


// List the component types
router.get('/components/types', permissions.checkPermission("components:view"), async function(req, res, next)
{
  // Get a list of the component type forms that have already been used to create components of that type
  var componentTypes = await ComponentTypes.list();
  var types = await Components.getTypes();

  // Add onto this list any component type forms that exist but haven't been used yet
  var forms = await Forms.list('componentForms');
  var componentTypes = deepmerge(types, forms);

  // Render the page showing the list of component types
  res.render("list_componentTypes.pug", {componentTypes});
});


// List recently edited or created components of a single type
router.get('/components/:type', permissions.checkPermission("components:view"), async function(req, res, next)
{
  // Set the type in question
  var type = decodeURIComponent(req.params.type);

  // List the (first 30) components which have a type matching this type, ordered by last modified
  var components = await Components.list({type: type}, {limit: 30});

//  logger.info(components);

  // Render the page showing the list of components
  res.render("list_components.pug", {components,
                                     title: "All '" + type + "' Type Components",
                                     type});
});


// Search for a specific component using a UUID
router.get('/search/componentsByUUID', permissions.checkPermission("components:view"), async function(req, res, next)
{
  // Render the search page
  res.render("search_componentsByUUID.pug");
});

