// Pull component data as json doc.
const express = require("express");
const Forms = require("../lib/Forms.js");
const Components = require("../lib/Components.js");
const Tests = require("../lib/Tests.js")('test');
const Jobs = require("../lib/Tests.js")('job');
// const Jobs = require("../lib/Jobs.js");
const Cache = require("../lib/Cache.js");
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

router.get('/componentTypes', permissions.checkPermissionJson('components:view'), 
  async function(req,res,next){
    // FIXME, this is just extant types, does not include form info
    try {
      var data = await Components.getTypes(req.query.type);
      return res.json(data);
    } catch(err) {
      res.status(400).json({error:err.toString()})
    }  
  }
);

router.get('/componentTypesTags', permissions.checkPermissionJson('components:view'), 
  async function(req,res,next){
    // FIXME, add search terms
    try {
      var data = await Forms.list("componentForms");
      var list=[{formId:"Trash"}];
      for(key in data) {
        list.push(data[key]);
      }
      return res.json(list);
    } catch(err) {
      res.status(400).json({error:err.toString()})
    }  
  }
);




////////////////////////////////////////////////////////
// Forms

// API/Backend: Get a list of form schema
router.get('/:collection(testForms|componentForms|jobForms)', permissions.checkPermissionJson('forms:view'), 
  async function(req,res,next){
    try {
      var list = await Forms.list(req.params.collection)
      res.json(list);
    }catch(err) {
      res.status(400).json({error:err.toString()})
    } 
  });

// API/Backend: Get a form schema

router.get('/:collection(testForms|componentForms|jobForms)/:formId', permissions.checkPermissionJson('forms:view'), 
  async function(req,res,next){
    if(req.params.collection == 'componentForms') Cache.invalidate('componentTypes');  

    var rec = await Forms.retrieve(req.params.collection,req.params.formId);
    // if(!rec) return res.status(404).send("No such form exists");
    if(!rec) { res.status(400).json({error:"no such form "+req.params.formId}); return next(); };
    console.log(rec);
    res.json(rec);
  }
);


// API/Backend: Update a form schema.
router.post('/:collection(testForms|componentForms|jobForms)/:formId', permissions.checkPermissionJson('forms:edit'), 
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
router.post("/test", permissions.checkPermissionJson('tests:submit'), 
  async function submit_test_data(req,res,next) {
    console.log(chalk.blue("Form submission",req.params.formId));
    // var body = await parse.json(req);
    try {
      console.log("Submission to /test",JSON.stringify(req.body,null,2));
      var outrec = await Tests.save(req.body, req);
      res.json({_id: outrec._id});
    } catch(err) {
      console.error("error submitting form /test"+req.params.formId);
      console.error(err);
      res.status(400).json({error:err.toString()});
    } 
  }
);


// Get a specific test

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

// Get list of tests done on a specific component

router.get("/tests/"+utils.uuid_regex,  permissions.checkPermissionJson('tests:view'), 
  async function (req,res,next) {
  try {
    return res.json(await Tests.listComponentTests(req.params.uuid));
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


// searching via POST parameters
// 
// /search/<recordType>/<type>?search=<textsearch>&insertAfter=<date>&insertBefore=<date>
router.post("/search/:recordType(component|job|test)?/:formId?",  permissions.checkPermissionJson('tests:view'), 
  async function retrieve_test_data(req,res,next) {
  try {
    console.log("search request",req.params,req.body);
    var searchterms = null;
    var matchobj = {...req.body};
    var formId = null;
    var limit = req.query.limit;
    var skip = req.query.skip;
    if(req.params.formId) formId = decodeURIComponent(req.params.formId);

    if(matchobj.search) {
      searchterms = decodeURIComponent(matchobj.search);
      delete matchobj.search;
    }
    if(matchobj.insertionAfter) {
      matchobj["insertion.insertDate"] = {...matchobj["insertion.insertDate"],$gte: new Date(matchobj.insertionAfter)};
      delete matchobj.insertionAfter;
    }
    if(matchobj.insertionBefore) {
      matchobj["insertion.insertDate"] = {...matchobj["insertion.insertDate"],$lte: new Date(matchobj.insertionBefore)};
      delete matchobj.insertionBefore;
    }

    if(Object.keys(matchobj).length<1 && !searchterms) throw new Error("No search parameter specified.")

    var result = [];
    if(!req.params.recordType || req.params.recordType === 'component') {
      if(formId) matchobj.type = formId;
      result.push(...await Components.search(searchterms,matchobj,limit,skip));
      console.log("result",result);
    }
    if(!req.params.recordType ||req.params.recordType === 'test') {
      if(formId) matchobj.formId = formId;
      console.log("matchobj",matchobj);
      result.push(...await Tests.search(searchterms,matchobj,limit,skip));
      console.log("result",result);
    }
    if(!req.params.recordType || req.params.recordType === 'job') {
      if(formId) matchobj.formId = formId;
      result.push(...await Jobs.search(searchterms,matchobj,limit,skip));
      console.log("result",result);
    }
    return res.json(result);


  } catch(err) {
    console.log(err);
      res.status(400).json({error:err.toString()});
  }
});

