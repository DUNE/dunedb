
const permissions = require('../permissions.js');
const Forms = require('../Forms.js');
const Tests = require('../Tests.js');
const express  = require("express");
const utils = require("../utils.js");

var router = express.Router();

module.exports = router;

// HTML/Pug routes:

async function seeTestData(req,res,next) {
  var formrec = await Forms.retrieveForm(req.params.form_id,);
  if(!formrec) return res.status(400).send("No such test form");  
  var data = await Tests.getTestData(req.params.form_id, req.params.record_id);
  if(!data) res.status(404).render("No such test recorded.");
  res.render('viewTest.pug',{form_id:req.params.form_id, formrec:formrec, testdata:data, retrieved:true})
};

router.get("/test/:form_id/:record_id", permissions.checkPermission("tests:view"), seeTestData);
router.get("/"+ utils.uuid_regex + "/test/:form_id/:record_id", permissions.checkPermission("tests:view"), seeTestData);


// Run a new test, but no UUID specified

router.get("/test/:form_id",permissions.checkPermission("tests:submit"),async function(req,res,next){
  var form = await Forms.retrieveForm(req.params.form_id,);
  res.render('test_without_uuid.pug',{form_id:req.params.form_id,form:form});
})

/// Run an new test

router.get("/"+utils.uuid_regex+"/test/:form_id", permissions.checkPermission("tests:submit"),
async function(req,res,next) {
  try{
    console.log("run a new test");
    var form = await Forms.retrieveForm(req.params.form_id,);
    if(!form) return res.status(400).send("No such test form");
    res.render('test.pug',{form_id:req.params.form_id, form:form, testdata:{data:{componentUuid: req.params.uuid}}})
  } catch(err) { console.error(err); next(); }
});


