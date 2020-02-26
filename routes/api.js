// Pull component data as json doc.
const express = require("express");
const Forms = require("../Forms.js");
const Components = require("../Components.js");
const Tests = require("../Tests.js");
const utils = require("../utils.js");
const permissions = require("../permissions.js");
const chalk = require("chalk");

var router = express.Router();
module.exports = router;

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
      data = Components.saveComponent(data,req,(req.user||{})); 
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
      res.status(400).json({error:err})
    }  
  }
);


////////////////////////////////////////////////////////
// Forms

// API/Backend: Get a form schema
router.get('/:collection(testForms|componentForm)/:form_id', permissions.checkPermissionJson('forms:view'), 
  async function(req,res,next){
    var rec = await Forms.retrieveForm(req.params.form_id, req.params.collection);
    // if(!rec) return res.status(404).send("No such form exists");
    if(!rec) { res.status(400).json({error:"no such form "+req.params.form_id}); return next(); };
    console.log(rec);
    res.json(rec);
  }
);


// API/Backend:  Change the form schema.
router.post('/:collection(testForms|componentform)/:form_id', permissions.checkPermissionJson('forms:edit'), 
  async function(req,res,next){
    console.log(chalk.blue("Schema submission","/json/testForms"));

    var form_id = req.params.form_id; 
    try{
      var inserted_record = await Forms.saveForm(form_id, req.body, "testForms", req.ip, req.user);
      res.json(inserted_record);
    } catch(err) { 
      console.error(err);
      res.status(400).json({error:err}) 
    }
  }
);


/////////////////////////////////////////////////////////////
// Test data

/// submit test form data

router.post("/submit/:form_id", permissions.checkPermissionJson('tests:submit'), 
  async function submit_test_data(req,res,next) {
    console.log(chalk.blue("Form submission",req.params.form_id));
    // var body = await parse.json(req);
    var id = null;
    try {
      id = await Tests.saveTestData(req.params.form_id, req.body, req.ip, req.user);
      res.json({_id: id});
    } catch(err) {
      console.error("error submitting form /submit/"+req.params.form_id);
      console.error(err);
      res.status(400).json({error:err});
    } 
  }
);




// One route for users, one route for the JWT authorized machine-to-machine API
router.get("/retrieve/:form_id/:record_id",  permissions.checkPermissionJson('tests:view'), 
  async function retrieve_test_data(req,res,next) {
  try {
    console.log(req.params.form_id, req.params.record_id)
      return res.json(await Tests.getTestData(req.params.form_id, req.params.record_id));
  } catch(err) {
      res.status(400).json({error:err});
  }
});


