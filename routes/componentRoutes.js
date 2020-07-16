// pug routes
const chalk = require('chalk');
const express = require('express');
const shortuuid = require('short-uuid')();
const MUUID = require('uuid-mongodb');
const moment = require('moment');

var Components = require('../lib/Components.js');
var permissions = require('../lib/permissions.js');
var Forms = require('../lib/Forms.js');
var Tests = require('../lib/Tests.js')('test');
var utils = require("../lib/utils.js");

var router = express.Router();

module.exports = router;

// Pull up an existing component for editing or just viewing.
console.log('regex',utils.uuid_regex);

async function get_component(req,res) {

  try{
    // deal with shortened form or full-form
    var componentUuid = (req.params.uuid) || shortuuid.toUUID(req.params.shortuuid);
    console.log(get_component,componentUuid,req.params);

    var component = await Components.retrieveComponent(componentUuid);
    if(!component) return res.status(400).send("No such component ID ",req.params.uuid);
    // get other data in one go
    let [componentform, forms, tests] = await Promise.all([
        Forms.retrieve("componentForm",component.type),
        Forms.getListOfForms(),
        Tests.listComponentTests(componentUuid)
      ]);
    if(!componentform) throw new Error("Component form for type \""+component.type+"\" does not exist");
    console.dir(forms);
    // console.log("component")
    // console.log(component);
    // console.log("tests");
    // console.log(tests);
    // console.log('componentForm');
    // console.log(componentform);
    res.render("component.pug",{
      schema: componentform.schema,
      componentUuid:componentUuid,
      component: component,
      canEdit: permissions.hasPermission("components:edit"),
      forms: forms,
      tests: tests
    });
  } catch (err) {
    console.error(err);
    res.status(400).send(err.toString())
  }
}
router.get('/'+utils.uuid_regex, permissions.checkPermission("components:view"), get_component);
router.get('/'+utils.short_uuregex, permissions.checkPermission("components:view"), get_component);



router.get("/"+utils.uuid_regex+'/history',permissions.checkPermission("components:view"),
  async function(req,res) {
  var componentUuid = (req.params.uuid) || shortuuid.toUUID(req.params.shortuuid);
  console.log(get_component,componentUuid,req.params);

  var date = null;
  if(req.query.date) {
    date = new Date(parseInt(req.query.date));
    console.log("Trying effective date",date)
  }

  var dates = await Components.retrieveComponentChangeDates(componentUuid);

  // get form and data in one go
  let [form, component] = await Promise.all([
      Forms.retrieve("componentForm","componentForm"),
      Components.retrieveComponent(componentUuid,date),
    ]);

  // equal:
  // var component = await Components.findOne({componentUuid:req.params.uuid});
  // var form = await Forms.retrieve("componentForm","componentForm");
  console.log("component")
  console.log(component);
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

async function edit_component(req,res) {
  // deal with shortened form or full-form
  var componentUuid = (req.params.uuid) || shortuuid.toUUID(req.params.shortuuid);
  console.log(get_component,componentUuid,req.params);

  var component = await Components.retrieveComponent(componentUuid);
  var form =      await Forms.retrieve("componentForm",component.type);

  var performed={};

  // equal:
  // var component = await Components.findOne({componentUuid:req.params.uuid});
  // var form = await Forms.retrieve("componentForm","componentForm");
  console.log("component")
  console.log(component);
  if(!component) return res.status(400).send("No such component ID.");

  // Change the default effectivedate to now
  component.effectiveDate = moment();

  res.render("component_edit.pug",{
    schema: form.schema,
    componentUuid:componentUuid,
    component: component,
    canEdit: permissions.hasPermission("components:edit"),
  });
}

router.get('/'+utils.uuid_regex+'/edit', permissions.checkPermission("components:edit"), edit_component);
router.get('/'+utils.short_uuid_regex+'/edit', permissions.checkPermission("components:edit"), edit_component);


async function component_label(req,res,next) {
  var componentUuid = (req.params.uuid) || shortuuid.toUUID(req.params.shortuuid);
  component = await Components.retrieveComponent(componentUuid);
  if(!component) return res.status(404).send("No such component exists yet in database");
  console.log({component: component});
  res.render('label.pug',{component: component});
}
router.get('/'+utils.uuid_regex+'/label', permissions.checkPermission("components:view"), component_label);
router.get('/'+utils.short_uuid_regex+'/label', permissions.checkPermission("components:view"), component_label);


// Create a new component


router.get("/NewComponent/:type", permissions.checkPermission("components:create"),
  // middlewareCheckDataEntryPrivs,
   async function(req,res){
    var type = decodeURIComponent(req.params.type);
    var form = await Forms.retrieve("componentForm",type);
    if(!form) res.status(400).send("No such type ",type)
    // roll a new UUID.

    var componentUuid = Components.newUuid();
    res.render("component_edit.pug",{
      schema: form.schema,
      componentUuid:componentUuid,
      component: { type: type, componentUuid: componentUuid },
      canEdit: permissions.hasPermission("components:edit"),
      tests:[],
      performed: [],
    });
});


// Edit component forms
var automaticallyCreateSchema =  require('../lib/automaticallyCreateSchema.js');
async function ensureTypeFormExists(type,req,res) {
  var form = await Forms.retrieve("componentForm",type);
  // if(form) return res.redirect("/EditComponentForm/:type");  // done!


  if(!form) {
    console.log(chalk.red("Creating a new form"))
    var newform = {
      formId: type,
      formName: type,
    };

    // Do any components exist for this type? if not, let's do automagic!
    var exists = await Components.getComponents(type);
    console.log(chalk.red('exists'),exists);
    if(exists && exists[type] && exists[type].length>0) {
        var records = [];
        for(var c of exists[type]) {
          records.push(await Components.retrieveComponent(c.componentUuid));
        }
        var auto = automaticallyCreateSchema(records);
        newform.schema = auto;
      console.log(chalk.red("Creating a new auto form"),auto)
    } else {
      // Create a blank form.
      newform.schema = {
          components:[
          {
            "label": "Name",
            "placeholder": "example: apa 10",
            "tooltip": "Human readable and searchable identifier or nickname. This field is required for all types. It may be calculated.",
            "tableView": true,
            "key": "name",
            "type": "textfield",
             "validate": { "required": true },
            "input": true
          },
          ]
        }
      console.log(chalk.red("Creating a new blank form"))

    }
    await Forms.save(newform,"componentForm",req);
  }
}


router.get("/EditComponentForm/:type", permissions.checkPermission("forms:edit"), async function(req,res){
  var type = decodeURIComponent(req.params.type);
  await ensureTypeFormExists(type,req,res); // FIXME  - this shouldn't be here; keeping during transition to
  res.render('EditComponentForm.pug',{collection:"componentForm",formId:type});
});

router.get("/NewComponentType/:type", permissions.checkPermission("forms:edit"), async function(req,res){
  try{
    var type = decodeURIComponent(req.params.type);
    await ensureTypeFormExists(type,req,res); // FIXME  - this shouldn't be here; keeping during transition to

    res.render('EditComponentForm.pug',{collection:"componentForm",formId:type});
  } catch (err) {
    console.log(err);
    res.status(400).send(err.toString());
  }
});




// Fixme: add query parameters

// List component types
router.get('/components/type',permissions.checkPermission("components:view"),
  async function(req,res,next) {
        // These are the components that already exist.
        var types = await Components.getTypes();

        // Add onto it any form types that exist, but haven't created objects yet.
        var forms = {...await Forms.getListOfForms('componentForm')};
        for(var existingType of types) {
          if(delete forms[existingType.type]);
        }
        for(var type in forms) {
          types.push({type: type, count: 0})
        }
        var sorted = types.sort((a,b)=>(''+a.type).localeCompare(b.type));
        res.render("components_types.pug",{types:sorted});

  });

// List components of a type
router.get('/components/type/:type',permissions.checkPermission("components:view"),
  async function(req,res,next) {
        var type = decodeURIComponent(req.params.type);
        var components = await Components.listAllOfType(type);
        console.log(components);
        res.render("components.pug",{components,type});

  });

