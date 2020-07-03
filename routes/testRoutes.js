
const permissions = require('../lib/permissions.js');
const Forms = require('../lib/Forms.js');
const Tests = require('../lib/Tests.js')('test');
const express  = require("express");
const utils = require("../lib/utils.js");

var router = express.Router();

module.exports = router;

// HTML/Pug routes:

// look at a test result.
router.get("/test/:record_id([A-Fa-f0-9]{24})", permissions.checkPermission("tests:view"), 
  async function(req,res,next) {
    try{
      var options = {};
      var data = await Tests.retrieve(req.params.record_id);
      if(!data) return res.status(404).render("No such test recorded.");
      var formId = data.formId;
      if(!formId) throw("Test has no formId");

      if(req.query.version) options.version = parseInt(req.query.version);
      
      // fixme rollback
      var formrec = await Forms.retrieve('testForms',formId,options);
      var versions = await Forms.getFormVersions('testForms',formId);
      console.log('versions',versions);
      if(!formrec) return res.status(400).send("No such test form");  
      res.render('viewTest.pug',{formId:req.params.formId, formrec:formrec, testdata:data, versions: versions, retrieved:true})
    } 
    catch(err) { 
      console.error(err); next(); 
    }
});

// Run a test, but no UUID specified
router.get("/test/:formId",permissions.checkPermission("tests:submit"),async function(req,res,next){
  var form = await Forms.retrieve('testForms',req.params.formId,);
  res.render('test_without_uuid.pug',{formId:req.params.formId,form:form});
})

/// Run a test
router.get("/"+utils.uuid_regex+"/test/:formId", permissions.checkPermission("tests:submit"),
async function(req,res,next) {
  try{
    console.log("run a new test");
    // only look for test version that's current now.
    var options = {onDate: new Date()};
    var form = await Forms.retrieve('testForms',req.params.formId,options);
    if(!form) return res.status(400).send("No such test form");
    res.render('test.pug',{formId:req.params.formId, form:form, componentUuid: req.params.uuid})
  } catch(err) { console.error(err); next(); }
});


// Resume editing a draft
router.get("/test/draft/:record_id([A-Fa-f0-9]{24})", permissions.checkPermission("tests:submit"),
async function(req,res,next) {
  try{
    console.log("resume draft",req.params.record_id);
    // get the draft.
    var testdata = await Tests.retrieve(req.params.record_id);
    if(!testdata) next();
    if(testdata.state != "draft") return res.status(400).send("Data is not a draft");
    console.log(testdata);
    if(!testdata.formId) return res.status(400).send("Can't find test data");

    var form = await Forms.retrieve('testForms',testdata.formId);
    if(!form) return res.status(400).send("No such test form");
    res.render('test.pug',{formId: testdata.formId, form:form, componentUuid: testdata.componentUuid, testdata:testdata})
  } catch(err) { console.error(err); next(); }
});

router.get("/test/deleteDraft/:record_id([A-Fa-f0-9]{24})", permissions.checkPermission("tests:submit"),
async function(req,res,next) {
  try{
    console.log("delete draft",req.params.record_id);
    // get the draft.
    var testdata = await Tests.retrieve(req.params.record_id);
    if(!testdata) next();
    if(testdata.state != "draft") return res.status(400).send("Data is not a draft");
    if(testdata.insertion.user.user_id != req.user.user_id) return res.status(400).send("You are not the draft owner");

    await Tests.deleteDraft(req.params.record_id);
    var backURL=req.header('Referer') || '/';
    res.redirect(backURL);
  } catch(err) { console.error(err); next(); }
});

// Lists recent tests of a specific kind
router.get('/tests/:formId', permissions.checkPermission("tests:view"), 
  async function(req,res,next) {
    var tests = await Tests.listRecent(req.params.formId,(req.query||{}).N);
    res.render('recentTests.pug',{formId:req.params.formId, tests: tests});
  });

// Lists recent tests of a specific kind
router.get('/tests', permissions.checkPermission("tests:view"), 
  async function(req,res,next) {
    var tests = await Tests.listRecent(null,(req.query||{}).N);
    res.render('recentTests.pug',{ tests: tests});
  });