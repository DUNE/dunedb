// pug routes
const chalk = require('chalk');
const express = require('express');
const shortuuid = require('short-uuid')();
const MUUID = require('uuid-mongodb');
const moment = require('moment');
const deepmerge = require('deepmerge');

const Components = require('../lib/Components.js');
const ComponentTypes = require('../lib/ComponentTypes.js');
const permissions = require('../lib/permissions.js');
const Forms = require('../lib/Forms.js');
const Tests = require('../lib/Tests.js')('test');
const utils = require("../lib/utils.js");

var router = express.Router();

module.exports = router;

function setRecent(req,type,item)
{
  // list is set with most recent first.
  if(!req.session) return;
  // req.session.recent = {};
  req.session.recent = req.session.recent || {};
  req.session.recent[type] = req.session.recent[type] || [];
  var list = req.session.recent[type];
  var i = list.indexOf(item);
  if(i>-1) list.splice(i,1);
  list.unshift(item);
  // logger.info("list",list);
  logger.info(chalk.blue("recent:",JSON.stringify((req.session||{}).recent)));
}

// Pull up an existing component for editing or just viewing.
async function get_component(req,res) {
  try{
    // deal with shortened form or full-form
    var componentUuid = req.params.uuid;
    // logger.info(get_component,componentUuid,req.params);

    var component = await Components.retrieve(componentUuid);
    if(!component) {
      if(permissions.hasPermission(req,"components:create")) res.redirect("/"+componentUuid+"/edit");
      return res.status(400).send("No such component ID "+req.params.uuid);
    }
    // get other data in one go
    let [formrec, forms, tests, relationships] = await Promise.all([
        Forms.retrieve("componentForms",component.type),
        Forms.list(),
        Tests.listComponentTests(componentUuid),
        Components.relationships(componentUuid),
      ]);
    if(!formrec) {
      // throw new Error("Component form for type \""+component.type+"\" does not exist");
      return res.render("component_without_form.pug",{componentUuid,component,forms,tests});
    } 
    // logger.info(forms);
    // logger.info("component")
    // logger.info(component);
    // logger.info("tests",tests);
    // logger.info(tests);
    // logger.info('componentForms');
    // logger.info(componentform);
    // logger.info(JSON.stringify(relationships,null,2));

    setRecent(req,'componentUuid',componentUuid);


    res.render("component.pug",{
      formrec,
      componentUuid,
      component,
      relationships,
      forms,
      tests,
      canEdit: permissions.hasPermission(req,"components:edit"),
    });

  } catch (err) {
    logger.error(err);
    res.status(400).send(err.toString())
  }
}

router.get('/'+utils.uuid_regex, permissions.checkPermission("components:view"), get_component);
router.get('/component/'+utils.uuid_regex, permissions.checkPermission("components:view"), get_component);

// allow short UUIDs
router.get('/'+utils.short_uuid_regex,function(req,res,next) {
  res.redirect('/component/'+utils.unshortenUuid(req.params.shortuuid));
});



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

async function edit_component(req,res) {
  // deal with shortened form or full-form
  var componentUuid = (req.params.uuid) || shortuuid.toUUID(req.params.shortuuid);
  // logger.info(get_component,componentUuid,req.params);

  var component = await Components.retrieve(componentUuid);
  if(!component || !component.type) {
    // This component hasn't yet been registered. That's ok, it hasn't thrown an error,
    // so the uuid is valid format, it just doesn't have a record attached.
    // Return an editing form for a new component.
    component = { componentUuid: componentUuid };
    // return res.status(400).send("No such component ID.");
  }
  // Now done via ajax. Allows type change.
  // var form =      await Forms.retrieve("componentForms",component.type);


  res.render("component_edit.pug",{
    componentUuid:componentUuid,
    component: component
  });
}

router.get('/'+utils.uuid_regex+'/edit', permissions.checkPermission("components:edit"), edit_component);
router.get('/'+utils.short_uuid_regex+'/edit', permissions.checkPermission("components:edit"), edit_component);


async function component_label(req,res,next) {
  var componentUuid = (req.params.uuid) || shortuuid.toUUID(req.params.shortuuid);
  component = await Components.retrieve(componentUuid);
  if(!component) return res.status(404).send("No such component exists yet in database");
  // logger.info({component: component});
  res.render('label.pug',{component: component});
}
router.get('/'+utils.uuid_regex+'/label', permissions.checkPermission("components:view"), component_label);
router.get('/'+utils.short_uuid_regex+'/label', permissions.checkPermission("components:view"), component_label);


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
// Create a new component


router.get("/NewComponent/:type", permissions.checkPermission("components:create"),
  // middlewareCheckDataEntryPrivs,
   async function(req,res){
    try{
      var type = decodeURIComponent(req.params.type);
      var form = await Forms.retrieve("componentForms",type);
      if(!form) return res.status(400).send("No such type "+type);
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
    } catch(err) {
      logger.info(err);
      res.status(400).send(err.toString());
    }
});


// Edit component forms
var automaticallyCreateSchema =  require('../lib/automaticallyCreateSchema.js');
async function ensureTypeFormExists(type,req,res) {
  var form = await Forms.retrieve("componentForms",type);
  // if(form) return res.redirect("/EditComponentForm/:type");  // done!


  if(!form) {
    logger.info(chalk.red("Creating a new form"))
    var newform = {
      formId: type,
      formName: type,
    };

    // Do any components exist for this type? if not, let's do automagic!
    var exists = await Components.list({type:type},{limit:1});
    logger.info(chalk.red('exists'),exists);
    if(exists && exists[type] && exists[type].length>0) {
        var records = [];
        for(var c of exists[type]) {
          records.push(await Components.retrieve(c.componentUuid));
        }
        var auto = automaticallyCreateSchema(records);
        newform.schema = auto;
      logger.info(chalk.red("Creating a new auto form"),auto)
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
      logger.info(chalk.red("Creating a new blank form"))

    }
    await Forms.save(newform,"componentForms",req);
  }
}


router.get("/EditComponentForm/:type/:auto(auto)?", permissions.checkPermission("forms:edit"), async function(req,res){
  var type = decodeURIComponent(req.params.type);
  if(req.params.auto == "auto") 
   await ensureTypeFormExists(type,req,res); // FIXME  - this shouldn't be here; keeping during transition to
  res.render('EditComponentForm.pug',{collection:"componentForms",formId:type});
});

router.get("/NewComponentType/:type", permissions.checkPermission("forms:edit"), async function(req,res){
  try{
    var type = decodeURIComponent(req.params.type);
    await ensureTypeFormExists(type,req,res); // Needed when creating a new form.

    res.render('EditComponentForm.pug',{collection:"componentForms",formId:type});
  } catch (err) {
    logger.info(err);
    res.status(400).send(err.toString());
  }
});




// Fixme: add query parameters

// List component types
router.get('/components/type',permissions.checkPermission("components:view"),
  async function(req,res,next) {
        // These are the components that already exist.
        var componentTypes =  await ComponentTypes.list();

        var types = await Components.getTypes();

        // Add onto it any form types that exist, but haven't created objects yet.
        var forms = await Forms.list('componentForms');

        var componentTypes = deepmerge(types,forms);
        // for(var existingType of types) {
        //   if(delete forms[existingType.type]);
        // }
        // for(var type in forms) {
        //   logger.info('***',forms[type]);
        //   types.push({type: type, count: 0, ...forms[type]})
        // }
        // var sorted = types.sort((a,b)=>(''+a.type).localeCompare(b.type));
        res.render("components_types.pug",{componentTypes});

  });

// List components of a type
router.get('/components/type/:type',permissions.checkPermission("components:view"),
  async function(req,res,next) {
        var type = decodeURIComponent(req.params.type);
        var components = await Components.list({type:type},{limit:30});

        // logger.info(components);
        res.render("components.pug",
          {components,
           title:"Components of type <"+type+">",
           type});

  });


// List recently edited or created components
router.get('/components/recent',permissions.checkPermission("components:view"),
  async function(req,res,next) {
        var type = decodeURIComponent(req.params.type);
        var components = await Components.list(null,{limit:30});
        var forms = await Forms.list('componentForms');
        // logger.info(components);
        res.render("components.pug",{forms,components,title:"Redcently Edited Components",showType:true});

  });

// List recently edited or created components
router.get('/components/searchUuid',permissions.checkPermission("components:view"),
  async function(req,res,next) {
        res.render("componentsByUuid.pug");

  });