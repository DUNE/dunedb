// General pug requirements
const chalk = require('chalk');
const express = require('express');
const shortuuid = require('short-uuid')();
const MUUID = require('uuid-mongodb');
const moment = require('moment');
const deepmerge = require('deepmerge');

// Local Javascript libraries
const Components = require('lib/Components.js');
const ComponentTypes = require('lib/ComponentTypes.js');
const Courses = require('lib/Courses.js');
const Jobs = require("lib/Jobs.js")();
const permissions = require('lib/permissions.js');
const Forms = require('lib/Forms.js');
const Tests = require('lib/Tests.js')('test');
const utils = require("lib/utils.js");

var router = express.Router();
module.exports = router;


// [Internal Function] Add a component to the user's personal list of recently accessed components
function setRecent(req, type, item)
{
  // The generic list is set with most recent item appearing first
  if(!req.session) return;
  
  req.session.recent = req.session.recent || {};
  req.session.recent[type] = req.session.recent[type] || [];
  
  var list = req.session.recent[type];
  var i = list.indexOf(item);
  
  if(i > -1) list.splice(i, 1);
  list.unshift(item);
  
//  logger.info("list",list);
  logger.info(chalk.blue("recent:", JSON.stringify((req.session || {}).recent)));
}


// [Internal Function] View a single component
async function get_component(req, res)
{
  // Attempt to get the component information based on the supplied UUID
  // If no such component exists, display the corresponding error
  try
  {
    // Get the component UUID
    var componentUuid = req.params.uuid;
//    logger.info(get_component, componentUuid, req.params);

    // Retrieve the component data
    // If no such component exists and the user has permission to create components, redirect them to the component creation page
    // If no such component exists and the user does not have permission to create it, exit with error
    var component = await Components.retrieve(componentUuid);
    
    if(!component)
    {
      if(permissions.hasPermission(req, "components:create"))
      {
        res.redirect("/" + componentUuid + "/edit");
      }
      
      return res.status(400).send("No such component ID: " + req.params.uuid);
    }
    
    // Get the other data relating to the component all in one go
    let [formrec, forms, tests, relationships] = await Promise.all(
    [
      Forms.retrieve("componentForms", component.type),
      Forms.list(),
      Tests.listComponentTests(componentUuid),
      Components.relationships(componentUuid)
    ]);
    
    // If no form for the component's type exist, redirect to the "component without form" page
    if(!formrec)
    {
      return res.render("component_without_form.pug",{componentUuid, component,forms, tests});
    }
    
//    logger.info(forms);
//    logger.info("component")
//    logger.info(component);
//    logger.info("tests",tests);
//    logger.info(tests);
//    logger.info('componentForms');
//    logger.info(componentform);
//    logger.info(JSON.stringify(relationships,null,2));

    // Add the component to the user's list of recently accessed components
    setRecent(req, 'componentUuid', componentUuid);

    // Render the single component information page
    res.render("component.pug", {formrec,
                                 componentUuid,
                                 component,
                                 relationships,
                                 forms,
                                 tests,
                                 canEdit: permissions.hasPermission(req, "components:edit")});
  }
  catch (err)
  {
    logger.error(err);
    res.status(400).send(err.toString())
  }
}

// Instead of the full UUID, a component can also be accessed using the shortened UUID
router.get('/' + utils.uuid_regex, permissions.checkPermission("components:view"), get_component);
router.get('/' + utils.short_uuid_regex, permissions.checkPermission("components:view"), get_component);

// To add a little foolproofing, the single component page can be accessed by two different routes: "/[UUID]" or "/component/[UUID]"
// In the case of the latter being used, redirect to the former (for both full and shortened UUIDs)
router.get('/component/' + utils.uuid_regex, permissions.checkPermission("components:view"), function(req, res, next)
{
  res.redirect('/' + utils.uuid_regex);
});

router.get('/component/' + utils.short_uuid_regex, permissions.checkPermission("components:view"), function(req, res, next)
{
  res.redirect('/' + utils.short_uuid_regex);
});


// Show the label for a single component
async function component_label(req, res, next)
{
  // Get the component from the given (full or shortened) UUID
  // Throw an error if the UUID doesn't correspond to an existing component
  var componentUuid = (req.params.uuid) || shortuuid.toUUID(req.params.shortuuid);
  
  component = await Components.retrieve(componentUuid);
  
  if(!component) return res.status(404).send("No component with this UUID currently exists in the database!");
  
//  logger.info({component: component});
  
  // Render the component label page
  res.render('component_label.pug', {component: component});
}

// As with the component itself, the label can also be accessed by either the full or shortened UUID
router.get('/' + utils.uuid_regex + '/label', permissions.checkPermission("components:view"), component_label);
router.get('/' + utils.short_uuid_regex + '/label', permissions.checkPermission("components:view"), component_label);


// Show the traveller for a single component
async function component_traveller(req, res, next)
{
  // Get the component from the given (full or shortened) UUID
  var componentUuid = (req.params.uuid) || shortuuid.toUUID(req.params.shortuuid);
  
  // Get the component's information from all possible sources - component, type, tests, workflows and courses
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
}

// As with the component itself, the traveller can also be accessed by either the full or shortened UUID
router.get('/' + utils.uuid_regex + '/traveller/', permissions.checkPermission("components:view"), component_traveller);
router.get('/' + utils.short_uuid_regex + '/traveller/', permissions.checkPermission("components:view"), component_traveller);






router.get("/"+utils.uuid_regex+'/history',permissions.checkPermission("components:view"),
  async function(req,res) {
  var componentUuid = (req.params.uuid) || shortuuid.toUUID(req.params.shortuuid);
  // logger.info(get_component,componentUuid,req.params);

  var date = null;
  if(req.query.date) {
    date = new Date(parseInt(req.query.date));
    // logger.info("Trying effective date",date)
  }

  // get form and data in one go
  let [form, component, dates] = await Promise.all([
      Forms.retrieve("componentForms","componentForms"),
      Components.retrieve({componentUuid,"insertion.insertDate":{$lte:date}}),
      Components.retrieveComponentChangeDates(componentUuid)
    ]);

  // equal:
  // var component = await Components.findOne({componentUuid:req.params.uuid});
  // var form = await Forms.retrieve("componentForms","componentForms");
  if(!component) return res.status(400).send("No such component ID.");
  res.render("component_history.pug",{
    schema: form.schema,
    dates: dates,
    componentUuid:componentUuid,
    component: component,
    canEdit: permissions.hasPermission("components:edit"),
  });
  }
)

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
router.get('/' + utils.uuid_regex + '/edit', permissions.checkPermission("components:edit"), edit_component);
router.get('/' + utils.short_uuid_regex + '/edit', permissions.checkPermission("components:edit"), edit_component);


// [Internal Function] Make sure that a component type form already exists for the component type being requested
var automaticallyCreateSchema =  require('lib/automaticallyCreateSchema.js');

async function ensureTypeFormExists(type, req, res)
{
  var form = await Forms.retrieve("componentForms", type);
  
  if(!form)
  {
    logger.info(chalk.red("Creating a new component type form ..."))
    
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
router.get('/componentType/new/:type', permissions.checkPermission("forms:edit"), async function (req, res)
{
  try
  {
    var type = decodeURIComponent(req.params.type);
    
    // Even when creating a new component type, we still need to check if the type's form already exists
    await ensureTypeFormExists(type, req, res);
    
    // Render the component type editing page (this is the same page template that is used for creating a new component type)
    res.render('edit_componentTypeForm.pug', {collection: "componentForms", formId: type});
  }
  catch (err)
  {
    logger.info(err);
    res.status(400).send(err.toString());
  }
});

// Edit an existing component type form
router.get('/componentType/edit/:type/:auto(auto)?', permissions.checkPermission("forms:edit"), async function (req, res)
{
  var type = decodeURIComponent(req.params.type);
  
  // Check if the requested component type's form exists
  if(req.params.auto == "auto")
  {
    await ensureTypeFormExists(type, req, res);
  }
  
  // Render the component type editing page
  res.render('edit_componentTypeForm.pug', {collection: "componentForms", formId: type});
});


// List recently edited or created components
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
                                     title: "Recently Edited Components",
                                     showType: true});
});


// Search for a specific component using a UUID
router.get('/components/searchByUUID', permissions.checkPermission("components:view"), async function(req, res, next)
{
  // Render the search page
  res.render("component_searchByUUID.pug");
});


// List the component types
router.get('/componentTypes', permissions.checkPermission("components:view"), async function(req, res, next)
{
  // Get a list of the component types that already exist
  var componentTypes =  await ComponentTypes.list();
  var types = await Components.getTypes();

  // Add onto this list any component types that exist but haven't been used to create any components yet
  var forms = await Forms.list('componentForms');
  var componentTypes = deepmerge(types, forms);

  // Render the page showing the list of component types
  res.render("list_componentTypes.pug", {componentTypes});
});


// List (all or some) components of a single type
router.get('/componentType/:type', permissions.checkPermission("components:view"), async function(req, res, next)
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

