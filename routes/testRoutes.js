
const permissions = require('../permissions.js');
const Forms = require('../Forms.js');
const Tests = require('../Tests.js');
const express  = require("express");
const utils = require("../utils.js");

var router = express.Router();

module.exports = {
  router,
}

// HTML/Pug routes:

async function seeTestData(req,res,next) {
  var formrec = await Forms.retrieveForm(req.params.form_id,);
  if(!formrec) return res.status(400).send("No such test form");  
  var data = await Tests.getTestData(req.params.form_id, req.params.record_id);
  if(!data) res.status(404).render("No such test recorded.");
  res.render('viewTest.pug',{form_id:req.params.form_id, formrec:formrec, testdata:data, retrieved:true})
};

router.get("/test/:form_id/:record_id", seeTestData);
router.get("/"+ utils.uuid_regex + "/test/:form_id/:record_id", seeTestData);


// Run a new test, but no UUID specified

router.get("/test/:form_id",permissions.middlewareCheckDataEntryPrivs,async function(req,res,next){
  var form = await Forms.retrieveForm(req.params.form_id,);
  res.render('test_without_uuid.pug',{form_id:req.params.form_id,form:form});
})

/// Run an new test

router.get("/"+utils.uuid_regex+"/test/:form_id", async function(req,res,next) {
  try{
    console.log("run a new test");
    var form = await Forms.retrieveForm(req.params.form_id,);
    if(!form) return res.status(400).send("No such test form");
    res.render('test.pug',{form_id:req.params.form_id, form:form, testdata:{data:{componentUuid: req.params.uuid}}})
  } catch(err) { console.error(err); next(); }
});


///////
///  JSON-data routes


/// submit test form data
async function submit_test_data(req,res,next) {
    console.log(chalk.blue("Form submission",req.params.form_id));
  // var body = await parse.json(req);
  var id = null;
  try {
    id = Tests.saveTestData(req.params.form_id, req.body, req.user);
    res.json({_id: id});
  } catch(err) {
    console.error("error submitting form /submit/"+req.params.form_id);
    console.error(err);
    res.status(400).json({error:err});
  } 
}

// One route for users, one route for the JWT authorized machine-to-machine API
router.post("/json/submit/:form_id", permissions.middlewareCheckDataEntryPrivs, submit_test_data);
router.post("/api/submit/:form_id", permissions.checkJwt, submit_test_data);



async function retrieve_test_data(req,res,next) {
  try {
    console.log(req.params.form_id, req.params.record_id)
      return res.json(await Tests.getTestData(req.params.form_id, req.params.record_id));
  } catch(err) {
      res.status(400).json({error:err});
  }
}


// One route for users, one route for the JWT authorized machine-to-machine API
router.get("/json/retrieve/:form_id/:record_id",  permissions.middlewareCheckDataViewPrivs, retrieve_test_data);
router.get("/api/get/:form_id/:record_id", permissions.checkJwt, retrieve_test_data);


