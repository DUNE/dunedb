// pug routes
const chalk = require('chalk');
const express = require('express');
const shortuuid = require('short-uuid')();
const MUUID = require('uuid-mongodb');
const moment = require('moment');

var Components = require('../lib/Components.js');
var permissions = require('../lib/permissions.js');
var Forms = require('../lib/Forms.js');
var Tests = require('../lib/Tests.js')
var utils = require("../lib/utils.js");

var router = express.Router();

module.exports = router;

// Pull up an existing component for editing or just viewing.
console.log('regex',utils.uuid_regex);

async function get_component(req,res) {
  // deal with shortened form or full-form
  var componentUuid = (req.params.uuid) || shortuuid.toUUID(req.params.shortuuid);
  console.log(get_component,componentUuid,req.params);

  // get form and data in one go
  let [componentform, component, forms, tests] = await Promise.all([
      Forms.retrieveForm("componentForm","componentForm"),
      Components.retrieveComponent(componentUuid),
      Forms.getListOfForms(),
      Tests.listComponentTests(componentUuid)
    ]);


  console.dir(forms);
  // equal:
  // var component = await Components.findOne({componentUuid:req.params.uuid});
  // var form = await Forms.retrieveForm("componentForm","componentForm");
  console.log("component")
  console.log(component);
  console.log("tests");
  console.log(tests);
  if(!component) return res.status(400).send("No such component ID.");
  res.render("component.pug",{
    schema: componentform.schema,
    componentUuid:componentUuid,
    component: component,
    canEdit: permissions.hasPermission("components:edit"),
    forms: forms,
    tests: tests
  });
}
router.get('/'+utils.uuid_regex, permissions.checkPermission("components:view"), get_component);
router.get('/'+utils.short_uuregex, permissions.checkPermission("components:view"), get_component);



router.get("/"+utils.uuid_regex+'/history',permissions.checkPermission("components:view"),
  async function(req,res) {
  var componentUuid = (req.params.uuid) || shortuuid.toUUID(req.params.shortuuid);
  console.log(get_component,componentUuid,req.params);

  var effectiveDate = null;
  if(req.query.effectiveDate) {
    effectiveDate = new Date(parseInt(req.query.effectiveDate));
    console.log("Trying effective date",effectiveDate)
  }

  var effectiveDates = await Components.retrieveComponentChangeDates(componentUuid);

  // get form and data in one go
  let [form, component] = await Promise.all([
      Forms.retrieveForm("componentForm","componentForm"),
      Components.retrieveComponent(componentUuid,effectiveDate),
    ]);

  // equal:
  // var component = await Components.findOne({componentUuid:req.params.uuid});
  // var form = await Forms.retrieveForm("componentForm","componentForm");
  console.log("component")
  console.log(component);
  if(!component) return res.status(400).send("No such component ID.");
  res.render("component_history.pug",{
    schema: form.schema,
    effectiveDates: effectiveDates,
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

  // get form and data in one go
  let [form, component] = await Promise.all([
      Forms.retrieveForm("componentForm","componentForm"),
      Components.retrieveComponent(componentUuid),
    ]);

  var performed={};

  // equal:
  // var component = await Components.findOne({componentUuid:req.params.uuid});
  // var form = await Forms.retrieveForm("componentForm","componentForm");
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
  component = Components.retrieveComponent(componentUuid);
  if(!component) return res.status(404).send("No such component exists yet in database");
  console.log({component: component});
  res.render('label.pug',{component: component});
}
router.get('/'+utils.uuid_regex+'/label', permissions.checkPermission("components:view"), component_label);
router.get('/'+utils.short_uuid_regex+'/label', permissions.checkPermission("components:view"), component_label);





// Create a new component


router.get("/NewComponent", permissions.checkPermission("components:create"),
  // middlewareCheckDataEntryPrivs,
   async function(req,res){
  var form = await Forms.retrieveForm("componentForm","componentForm");
  // roll a new UUID.

  var componentUuid = Components.newUuid().toString();
  res.render("component_edit.pug",{
    schema: form.schema,
    componentUuid:componentUuid,
    component: {componentUuid:componentUuid},
    canEdit: permissions.hasPermission("components:edit"),
    tests:[],
    performed: [],
  });
});


// Edit component form.
router.get("/EditComponentForm", permissions.checkPermission("forms:edit"), async function(req,res){
  res.render('EditComponentForm.pug',{collection:"componentForm",form_id:"componentForm"});
});



