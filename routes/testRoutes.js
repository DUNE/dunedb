"use strict";

const permissions = require('../lib/permissions.js');
const Forms = require('../lib/Forms.js');
const Components = require('../lib/Components.js');
const Tests = require('../lib/Tests.js')('test');
const Processes = require('../lib/Processes.js');
const express  = require("express");
const utils = require("../lib/utils.js");

var router = express.Router();

module.exports = router;

// HTML/Pug routes:

// look at a test result.
router.get("/test/:record_id([A-Fa-f0-9]{24})", permissions.checkPermission("tests:view"), 
  async function(req,res,next) {
    try{
      logger.info("finding test ",req.params.record_id)
      var options = {};
      // get stuff in one go
      let [test,processes] = await Promise.all([
          Tests.retrieve(req.params.record_id),
          Processes.findInputRecord(req.params.record_id),
        ]);

      var component = await Components.retrieve(test.componentUuid);

      if(!test) return res.status(404).render("No such test recorded.");
      var formId = test.formId;
      if(!formId) throw("Test has no formId");

      if(req.query.version) options.version = parseInt(req.query.version);
      
      // fixme rollback
      var formrec = await Forms.retrieve('testForms',formId,options);
      var versions = await Forms.getFormVersions('testForms',formId);
      logger.info('versions',versions);
      if(!formrec) return res.status(400).send("No such test form");  
      res.render('viewTest.pug',{formId:req.params.formId, formrec, testdata:test, processes, versions, component, retrieved:true})
  } catch(err) {  logger.error(err); res.status(400).send(err.toString()); }

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
    logger.info("run a new test");
    // only look for test version that's current now.
    var options = {onDate: new Date()};
    var form = await Forms.retrieve('testForms',req.params.formId,options);
    if(!form) return res.status(400).send("No such test form");
    res.render('test.pug',{formId:req.params.formId, form, componentUuid: req.params.uuid})
  } catch(err) {  logger.error(err); res.status(400).send(err.toString()); }
});

/// Run a multitest
router.get("/multitest/:formId", permissions.checkPermission("tests:submit"),
async function(req,res,next) {
  try{
    logger.info("run a multitest session");
    var options = {onDate: new Date()};
    var form = await Forms.retrieve('testForms',req.params.formId,options);
    if(!form) return res.status(400).send("No such test form");
    res.render('run_multi_test.pug',{formId:req.params.formId, form})
  } catch(err) {  logger.error(err); res.status(400).send(err.toString()); }
});


// Resume editing a draft
router.get("/test/draft/:record_id([A-Fa-f0-9]{24})", permissions.checkPermission("tests:submit"),
async function(req,res,next) {
  try{
    logger.info("resume draft",req.params.record_id);
    // get the draft.
    var testdata = await Tests.retrieve(req.params.record_id);
    if(!testdata) next();
    if(testdata.state != "draft") return res.status(400).send("Data is not a draft");
    logger.info(testdata);
    if(!testdata.formId) return res.status(400).send("Can't find test data");

    var form = await Forms.retrieve('testForms',testdata.formId);
    if(!form) return res.status(400).send("No such test form");
    res.render('test.pug',{formId: testdata.formId, form:form, componentUuid: testdata.componentUuid, testdata:testdata})
  } catch(err) {  logger.error(err); res.status(400).send(err.toString()); }
});

router.get("/test/deleteDraft/:record_id([A-Fa-f0-9]{24})", permissions.checkPermission("tests:submit"),
async function(req,res,next) {
  try{
    logger.info("delete draft",req.params.record_id);
    // get the draft.
    var testdata = await Tests.retrieve(req.params.record_id);
    if(!testdata) next();
    if(testdata.state != "draft") return res.status(400).send("Data is not a draft");
    if(testdata.insertion.user.user_id != req.user.user_id) return res.status(400).send("You are not the draft owner");

    await Tests.deleteDraft(req.params.record_id);
    var backURL=req.header('Referer') || '/';
    res.redirect(backURL);
  } catch(err) {  logger.error(err); res.status(400).send(err.toString()); }
});

// Lists recent tests generally, or a specific formId
router.get('/tests/:formId?', permissions.checkPermission("tests:view"), 
  async function(req,res,next) {
    var tests = await Tests.listRecent(req.params.formId,(req.query||{}).N);
    res.render('recentTests.pug',{formId:req.params.formId, tests: tests});
  });

router.get('/test/copyAsDraft/:record_id([A-Fa-f0-9]{24})',permissions.checkPermission("tests:submit"),
  async function(req,res,next) {
    try{
      var newdraft = await Tests.copyToDraft(req.params.record_id,req);
      logger.info("Made copy ",newdraft);
      if(newdraft) res.redirect("/test/draft/"+newdraft._id.toString())

    } catch(err) {  logger.error(err); res.status(400).send(err.toString()); }

})


