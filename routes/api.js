// Pull component data as json doc.
const express = require("express");
const Forms = require("../lib/Forms.js");
const Components = require("../lib/Components.js");
const Tests = require("../lib/Tests.js")('test');
const Jobs = require("../lib/Tests.js")('job');
// const Jobs = require("../lib/Jobs.js");
const utils = require("../lib/utils.js");
const permissions = require("../lib/permissions.js");
const chalk = require("chalk");
const pretty = require('express-prettify');

var router = express.Router();
module.exports = router;

router.use(pretty({query:'pretty'})); // allows you to use ?pretty to see nicer json.


// /generateComponentUuid
// data format: none
router.get('/generateComponentUuid', permissions.checkPermissionJson('components:edit'), 
  async function(req,res){
    res.json(Components.newUuid().toString());
  }
);

// GET /component/uuid
// data format: none
// retrieves component of given id
router.get('/component/'+utils.uuid_regex, permissions.checkPermissionJson('components:view'), 
  async function(req,res){
    // fresh retrival
    var componentUuid = (req.params.uuid) || shortuuid.toUUID(req.params.shortuuid);
    var component= await Components.retrieveComponent(componentUuid);
    if(!component)  return res.status(400).json({error:"UUID not found"});
    res.json(component);
  }
);



// POST /component/uuid
// data format: {
//   data: {
//     component fields, including uuid
//   }
// }
//
// retrieves component of given id
router.post('/component/'+utils.uuid_regex, permissions.checkPermissionJson('components:edit'), 
  async function(req,res,next){
    var componentUuid = (req.params.uuid) || shortuuid.toUUID(req.params.shortuuid);
    var record = req.body;
    record.componentUuid = componentUuid; // Ensure that record is keyed with URL route
    try {
      console.log("saving component",record);
      data = await Components.saveComponent(record,req);
      return res.json(data);
    } catch(err) {
      console.error(err);
      res.status(400).json({error:"Save failure "+err.toString()})
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

router.get('/components', permissions.checkPermissionJson('components:view'), 
  async function(req,res,next){
    // FIXME, add search terms
    try {
      var data = await Components.getComponents(req.query.type);
      return res.json(data);
    } catch(err) {
      res.status(400).json({error:err.toString()})
    }  
  }
);


////////////////////////////////////////////////////////
// Forms


// API/Backend: Get a form schema

router.get('/:collection(testForms|componentForm|jobForms)/:formId', permissions.checkPermissionJson('forms:view'), 
  async function(req,res,next){
    var rec = await Forms.retrieve(req.params.collection,req.params.formId);
    // if(!rec) return res.status(404).send("No such form exists");
    if(!rec) { res.status(400).json({error:"no such form "+req.params.formId}); return next(); };
    console.log(rec);
    res.json(rec);
  }
);


// API/Backend: Update a form schema.
router.post('/:collection(testForms|componentForm|jobForms)/:formId', permissions.checkPermissionJson('forms:edit'), 
  async function(req,res,next){
    console.log(chalk.blue("Schema submission","/json/"+req.params.collection));

    var formId = req.params.formId;
    var input = req.body;
    try{
    if(req.body.formId !== formId)  throw new Error("FormId does not match API call.") 
      var inserted_record = await Forms.save(req.body, req.params.collection, req);
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
    console.log(chalk.blue("Form submission",req.params.formId));
    // var body = await parse.json(req);
    try {
      console.log("Submission to /test/",JSON.stringify(req.body,null,2));
      var outrec = await Tests.save(req.body, req);
      res.json({_id: outrec._id});
    } catch(err) {
      console.error("error submitting form /test/"+req.params.formId);
      console.error(err);
      res.status(400).json({error:err.toString()});
    } 
  }
);


router.get("/test/:record_id([A-Fa-f0-9]{24})",  permissions.checkPermissionJson('tests:view'), 
  async function retrieve_test_data(req,res,next) {
  try {
    console.log("retrieve test data",req.params);
    var record = await Tests.retrieve(req.params.record_id);
    return res.json(record,null,2);
  } catch(err) {
    console.log(JSON.stringify(err.toString()));
      res.status(400).json({error:err.toString()});
  }
});


/////////////////////////////////////////////////////////////
// Job data

/// submit job form data
// Same as test, but no componentUuid required.
router.post("/job", permissions.checkPermissionJson('jobs:submit'), 
  async function submit_test_data(req,res,next) {
    console.log(chalk.blue("Job submission",req.params.formId));
    // var body = await parse.json(req);
    try {
      var outrec  = await Jobs.save(req.body, req);
      res.json({_id: outrec._id});
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
    var record = await Jobs.retrieve(req.params.record_id);
    return res.json(record,null,2);
  } catch(err) {
    console.log(JSON.stringify(err.toString()));
      res.status(400).json({error:err.toString()});
  }
});


