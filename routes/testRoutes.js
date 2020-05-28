
const permissions = require('../lib/permissions.js');
const Forms = require('../lib/Forms.js');
const Tests = require('../lib/Tests.js');
const express  = require("express");
const utils = require("../lib/utils.js");

var router = express.Router();

module.exports = router;

// HTML/Pug routes:

router.get("/test/:record_id([A-Fa-f0-9]{24})", permissions.checkPermission("tests:view"), 
  async function(req,res,next) {
    try{
      var options = {};
      var data = await Tests.getTestData(req.params.record_id);
      if(!data) return res.status(404).render("No such test recorded.");
      var form_id = data.form_id;
      if(!form_id) throw("Test has no form_id");

      if(req.query.version) options.version = parseInt(req.query.version);
      // fixme rollback
      var formrec = await Forms.retrieveForm('testForms',form_id,options);
      var versions = await Forms.getFormVersions('testForms',form_id);
      console.log('versions',versions);
      if(!formrec) return res.status(400).send("No such test form");  
      res.render('viewTest.pug',{form_id:req.params.form_id, formrec:formrec, testdata:data, versions: versions, retrieved:true})
    } 
    catch(err) { 
      console.error(err); next(); 
    }
});

// Run a new test, but no UUID specified
router.get("/test/:form_id",permissions.checkPermission("tests:submit"),async function(req,res,next){
  var form = await Forms.retrieveForm('testForms',req.params.form_id,);
  res.render('test_without_uuid.pug',{form_id:req.params.form_id,form:form});
})

/// Run an new test
router.get("/"+utils.uuid_regex+"/test/:form_id", permissions.checkPermission("tests:submit"),
async function(req,res,next) {
  try{
    console.log("run a new test");
    var form = await Forms.retrieveForm('testForms',req.params.form_id,);
    if(!form) return res.status(400).send("No such test form");
    delete form.diff;
    delete form.user;
    res.render('test.pug',{form_id:req.params.form_id, form:form, testdata:{form_id: req.params.form_id, data:{componentUuid: req.params.uuid}}})
  } catch(err) { console.error(err); next(); }
});


router.get("/test/draft/:record_id([A-Fa-f0-9]{24})", permissions.checkPermission("tests:submit"),
async function(req,res,next) {
  try{
    console.log("resume draft",req.params.record_id);
    // get the draft.
    var testdata = await Tests.getTestData(req.params.record_id);
    if(!testdata) next();
    if(testdata.state != "draft") return res.status(400).send("Data is not a draft");
    console.log(testdata);
    if(!testdata.form_id) return res.status(400).send("Can't find test data");

    var form = await Forms.retrieveForm('testForms',testdata.form_id);
    if(!form) return res.status(400).send("No such test form");
    delete form.diff;
    delete form.user;
    res.render('test.pug',{form_id: testdata.form_id, form:form, testdata:testdata})
  } catch(err) { console.error(err); next(); }
});

router.get("/test/deleteDraft/:record_id([A-Fa-f0-9]{24})", permissions.checkPermission("tests:submit"),
async function(req,res,next) {
  try{
    console.log("resume draft",req.params.record_id);
    // get the draft.
    var testdata = await Tests.getTestData(req.params.record_id);
    if(!testdata) next();
    if(testdata.state != "draft") return res.status(400).send("Data is not a draft");
    if(testdata.user.user_id != req.user.user_id) return res.status(400).send("You are not the draft owner");

    await Tests.deleteDraft(req.params.record_id);
    var backURL=req.header('Referer') || '/';
    res.redirect(backURL);
  } catch(err) { console.error(err); next(); }
});

// Lists recent tests of a specific kind
router.get('/tests/:form_id', permissions.checkPermission("tests:view"), 
  async function(req,res,next) {
    var tests = await Tests.listRecentTests(req.params.form_id,(req.query||{}).N);
    res.render('recentTests.pug',{form_id:req.params.form_id, tests: tests});
  });

// Lists recent tests of a specific kind
router.get('/tests', permissions.checkPermission("tests:view"), 
  async function(req,res,next) {
    var tests = await Tests.listRecentTests(null,(req.query||{}).N);
    res.render('recentTests.pug',{ tests: tests});
  });