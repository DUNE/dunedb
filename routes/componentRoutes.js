// pug routes
const chalk = require('chalk');
const express = require('express');
const shortuuid = require('short-uuid')();

var components = require('../components.js');
var permissions = require('../permissions.js');
var forms = require('../forms.js');
var database = require('../database.js');
var utils = require("../utils.js");

var router = express.Router();

module.exports = {
  router,
}

// Pull up an existing component for editing or just viewing.
console.log('regex',utils.uuid_regex);

async function get_component(req,res) {
  // deal with shortened form or full-form
  var componentUuid = (req.params.uuid) || shortuuid.toUUID(req.params.shortuuid);
  console.log(get_component,componentUuid,req.params);

  // get form and data in one go
  let [form, component, tests] = await Promise.all([
      forms.retrieveForm("componentForm","componentForm"),
      components.retrieveComponent(componentUuid),
      forms.getListOfForms(),
    ]);

  for(test of tests) {
    console.log('checking for performed',test.form_id);
    var p = await db.collection("form_"+test.form_id).find({"data.componentUuid":componentUuid}).project({form_id:1, form_title:1, timestamp:1, user:1}).toArray();
    test.performed = p || [];
  }
  console.dir(tests);
  // equal:
  // var component = await components.findOne({componentUuid:req.params.uuid});
  // var form = await forms.retrieveForm("componentForm","componentForm");
  console.log("component")
  console.log(component);
  if(!component) return res.status(400).send("No such component ID.");
  res.render("component.pug",{
    schema: form.schema,
    componentUuid:componentUuid,
    component: component,
    canEdit: permissions.hasDataEditPrivs(),
    tests: tests,
  });
}
router.get('/'+utils.uuid_regex, permissions.middlewareCheckDataViewPrivs, get_component);
router.get('/'+utils.short_uuregex, permissions.middlewareCheckDataViewPrivs, get_component);

async function edit_component(req,res) {
  // deal with shortened form or full-form
  var componentUuid = (req.params.uuid) || shortuuid.toUUID(req.params.shortuuid);
  console.log(get_component,componentUuid,req.params);

  // get form and data in one go
  let [form, component, tests] = await Promise.all([
      forms.retrieveForm("componentForm","componentForm"),
      retrieveComponent(componentUuid),
      getListOfTests(),
    ]);

  var performed={};
  for(test of tests) {
    console.log('checking for performed',test.form_id);
    var p = await db.collection("form_"+test.form_id).find({"data.componentUuid":componentUuid}).project({form_id:1,  timestamp:1, user:1}).toArray();
    if(p.length>0) { 
       for(item of p) { item.form_title = test.form_title };
       performed[test.form_id] = p;
       console.dir(p);
    }
  }
  // equal:
  // var component = await components.findOne({componentUuid:req.params.uuid});
  // var form = await forms.retrieveForm("componentForm","componentForm");
  console.log("component")
  console.log(component);
  if(!component) return res.status(400).send("No such component ID.");
  res.render("component_edit.pug",{
    schema: form.schema,
    componentUuid:componentUuid,
    component: component,
    canEdit: permissions.hasDataEditPrivs(),
    tests: tests,
    performed: performed,
  });
}

router.get('/'+utils.uuid_regex+'/edit', permissions.middlewareCheckDataEditPrivs, edit_component);
router.get('/'+utils.short_uuid_regex+'/edit', permissions.middlewareCheckDataEditPrivs, edit_component);


async function component_label(req,res,next) {
  var componentUuid = (req.params.uuid) || shortuuid.toUUID(req.params.shortuuid);
  component = retrieveComponent(componentUuid);
  if(!component) return res.status(404).send("No such component exists yet in database");
  console.log({component: component});
  res.render('label.pug',{component: component});
}
router.get('/'+utils.uuid_regex+'/label', permissions.middlewareCheckDataViewPrivs, component_label);
router.get('/'+utils.short_uuid_regex+'/label', permissions.middlewareCheckDataViewPrivs, component_label);





// Create a new component


router.get("/NewComponent",
  permissions.middlewareCheckDataViewPrivs,
  // middlewareCheckDataEntryPrivs,
   async function(req,res){
  var form = await forms.retrieveForm("componentForm","componentForm");
  // roll a new UUID.
  var componentUuid = uuidv4()
  res.render("component_edit.pug",{
    schema: form.schema,
    componentUuid:componentUuid,
    component: {componentUuid:componentUuid},
    canEdit: permissions.hasDataEntryPrivs(),
    tests:[],
    performed: [],
  });
});



