// Pull component data as json doc.
const express = require("express");
const Forms = require("../lib/Forms.js");
const Components = require("../lib/Components.js");
const Tests = require("../lib/Tests.js");
const Jobs = require("../lib/Jobs.js");
const utils = require("../lib/utils.js");
const permissions = require("../lib/permissions.js");
const chalk = require("chalk");
const pretty = require('express-prettify');

var router = express.Router();
module.exports = router;

router.use(pretty({query:'pretty'})); // allows you to use ?pretty to see nicer json.


router.get('/generateComponentUuid', permissions.checkPermissionJson('components:edit'), 
  async function(req,res){
    res.json(Components.newUuid().toString());
  }
);

router.get('/component/'+utils.uuid_regex, permissions.checkPermissionJson('components:view'), 
  async function(req,res){
    // fresh retrival
    var componentUuid = (req.params.uuid) || shortuuid.toUUID(req.params.shortuuid);
    var component= await Components.retrieveComponent(componentUuid);
    if(!component)  return res.status(400).json({error:"UUID not found"});
    res.json(component);
  }
);



// Post component changes.

router.post('/component/'+utils.uuid_regex, permissions.checkPermissionJson('components:edit'), 
  async function(req,res,next){
    var componentUuid = (req.params.uuid) || shortuuid.toUUID(req.params.shortuuid);
    var data = req.body.data;
    try {
      data = await Components.saveComponent(data,req,(req.user||{})); 
      return res.json(data);
    } catch(err) {
      res.status(400).json({error:"Save failure "+err})
    }  
  }
);


// Component searching:
// router.get('/components/all', permissions.checkPermissionJson('components:view'), 
//   async function(req,res,next){
//     // FIXME, add search terms
//     try {
//       var data = await Components.getComponents();
//       return res.json(data);
//     } catch(err) {
//       res.status(400).json({error:err})
//     }  
//   }
// );

router.get('/components/:type', permissions.checkPermissionJson('components:view'), 
  async function(req,res,next){
    // FIXME, add search terms
    try {
      var data = await Components.getComponents(req.params.type);
      return res.json(data);
    } catch(err) {
      res.status(400).json({error:err.toString()})
    }  
  }
);


////////////////////////////////////////////////////////
// Forms

// API/Backend: Get a form schema
router.get('/:collection(testForms|componentForm|jobForms)/:form_id', permissions.checkPermissionJson('forms:view'), 
  async function(req,res,next){
    var rec = await Forms.retrieveForm(req.params.collection,req.params.form_id);
    // if(!rec) return res.status(404).send("No such form exists");
    if(!rec) { res.status(400).json({error:"no such form "+req.params.form_id}); return next(); };
    console.log(rec);
    res.json(rec);
  }
);


// API/Backend:  Change the form schema.
router.post('/:collection(testForms|componentform|jobForms)/:form_id', permissions.checkPermissionJson('forms:edit'), 
  async function(req,res,next){
    console.log(chalk.blue("Schema submission","/json/"+req.params.collection));

    var form_id = req.params.form_id; 
    try{
      var inserted_record = await Forms.saveForm(form_id, req.body, req.params.collection, req.ip, req.user);
      res.json(inserted_record);
    } catch(err) { 
      console.error(err);
      res.status(400).json({error:err.toString()}) 
    }
  }
);


/////////////////////////////////////////////////////////////
// Test data

/// submit test form data

router.post("/test/", permissions.checkPermissionJson('tests:submit'), 
  async function submit_test_data(req,res,next) {
    console.log(chalk.blue("Form submission",req.params.form_id));
    // var body = await parse.json(req);
    var id = null;
    try {
      if(!req.body.form_id) throw("No form_id specified. Invalid submission.")
      id = await Tests.saveTestData(req.body, req.ip, req.user);
      res.json({_id: id});
    } catch(err) {
      console.error("error submitting form /test/"+req.params.form_id);
      console.error(err);
      res.status(400).json({error:err.toString()});
    } 
  }
);


router.get("/test/:record_id([A-Fa-f0-9]{24})",  permissions.checkPermissionJson('tests:view'), 
  async function retrieve_test_data(req,res,next) {
  try {
    console.log("retrieve test data",req.params);
    var record = await Tests.getTestData(req.params.record_id);
    return res.json(record,null,2);
  } catch(err) {
    console.log(JSON.stringify(err.toString()));
      res.status(400).json({error:err.toString()});
  }
});


/////////////////////////////////////////////////////////////
// Job data

/// submit job form data

router.post("/job", permissions.checkPermissionJson('jobs:submit'), 
  async function submit_test_data(req,res,next) {
    console.log(chalk.blue("Job submission",req.params.form_id));
    // var body = await parse.json(req);
    var id = null;
    try {
      if(!req.body.form_id) throw("No form_id specified. Invalid submission.")
      id = await Jobs.saveJobData(req.body, req.ip, req.user);
      res.json({_id: id});
    } catch(err) {
      console.error("error submitting form /test/");
      console.error(err);
      res.status(400).json({error:err.toString()});
    } 
  }
);


router.get("/job/:record_id([A-Fa-f0-9]{24})",  permissions.checkPermissionJson('tests:view'), 
  async function retrieve_test_data(req,res,next) {
  try {
    console.log("retrieve test data",req.params);
    var record = await Jobs.getJobData(req.params.record_id);
    return res.json(record,null,2);
  } catch(err) {
    console.log(JSON.stringify(err.toString()));
      res.status(400).json({error:err.toString()});
  }
});


