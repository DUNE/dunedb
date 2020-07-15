
const permissions = require('../lib/permissions.js');
const Forms = require('../lib/Forms.js');
const Jobs = require('../lib/Tests.js')('job');
const Tests = require('../lib/Tests.js')('test');
const Processes = require('../lib/Processes.js');
const express  = require("express");
const utils = require("../lib/utils.js");

var router = express.Router();

module.exports = router;

// HTML/Pug routes:

// look at a job result
router.get("/job/:record_id([A-Fa-f0-9]{24})", permissions.checkPermission("tests:view"),
 async function(req,res,next) {
    try{
      var options = {};
      let [data,processes] = await Promise.all([
          Jobs.retrieve(req.params.record_id),
          Processes.findInputRecord(req.params.record_id)
        ]);
      if(!data) return res.status(404).send("No such job recorded.");
      var formId = data.formId;
      if(!formId) throw("Job has no formId");

      if(req.query.version) options.version = parseInt(req.query.version);
      // fixme rollback
      var formrec = await Forms.retrieve('jobForms',formId,options);
      var versions = await Forms.getFormVersions('jobForms',formId);
      console.log('versions',versions);
      if(!formrec) return res.status(400).send("No such job form");  
      res.render('viewTest.pug',{formId:req.params.formId, formrec:formrec, processes: processes, testdata:data, versions: versions, retrieved:true})
    } 
    catch(err) { 
      console.error(err); next(); 
    }

});
/// Run an new job
router.get("/job/:formId",permissions.checkPermission("jobs:submit"),async function(req,res,next){
  try{
    console.log("run a new job");
    var options = {onDate: new Date()};
    var workflow = await Forms.retrieve('jobForms',req.params.formId,options);
    if(!workflow) return res.status(400).send("No such job workflow");
    res.render('test.pug',{formId:req.params.formId, form:workflow, 
                          route_on_submit: '/job',
                          submission_url: '/json/job'});
  } catch(err) { console.error(err); next(); }
});

// Resume editing a draft
router.get("/job/draft/:record_id([A-Fa-f0-9]{24})", permissions.checkPermission("jobs:submit"),
async function(req,res,next) {
  try{
    console.log("resume draft",req.params.record_id);
    // get the draft.
    var jobdata = await Jobs.retrieve(req.params.record_id);
    if(!jobdata) next();
    if(jobdata.state != "draft") return res.status(400).send("Data is not a draft");
    console.log(jobdata);
    if(!jobdata.formId) return res.status(400).send("Can't find test data");

    var form = await Forms.retrieve('jobForms',jobdata.formId);
    if(!form) return res.status(400).send("No such test form");
    res.render('test.pug',{formId: jobdata.formId, form:form, testdata:jobdata, route_on_submit:'/job', submission_url:'/json/job'})
  } catch(err) { console.error(err); next(); }
});


router.get("/job/deleteDraft/:record_id([A-Fa-f0-9]{24})", permissions.checkPermission("jobs:submit"),
async function(req,res,next) {
  try{
    console.log("delete draft",req.params.record_id);
    // get the draft.
    var testdata = await Jobs.retrieve(req.params.record_id);
    if(!testdata) next();
    if(testdata.state != "draft") return res.status(400).send("Data is not a draft");
    if(testdata.insertion.user.user_id != req.user.user_id) return res.status(400).send("You are not the draft owner");

    await Jobs.deleteDraft(req.params.record_id);
    var backURL=req.header('Referer') || '/';
    res.redirect(backURL);
  } catch(err) { console.error(err); next(); }
});


// Lists recent tests generally, or a specific formId
router.get('/jobs/:formId?', permissions.checkPermission("tests:view"), 
  async function(req,res,next) {
    var tests = await Jobs.listRecent(req.params.formId,(req.query||{}).N);
    res.render('recentJobs.pug',{formId:req.params.formId, tests: tests});
  });

router.get('/job/copyAsDraft/:record_id([A-Fa-f0-9]{24})',permissions.checkPermission("tests:submit"),
  async function(req,res,next) {
    try{
      var newdraft = await Jobs.copyToDraft(req.params.record_id,req);
      console.log("Made copy ",newdraft);
      if(newdraft) res.redirect("/job/draft/"+newdraft._id.toString())

    } catch(err) {  console.error(err); res.status(400).send(err.toString()); }

})


// Common

router.get('/drafts',  permissions.checkPermission("tests:view"),
  async function(req,res,next){
  var job_drafts = null;
  var test_drafts = null;
  if(req.user && req.user.user_id) test_drafts=await Tests.listUserDrafts(req.user.user_id);
  if(req.user && req.user.user_id) job_drafts=await Jobs.listUserDrafts(req.user.user_id);
  res.render('drafts.pug',{test_drafts,job_drafts});
  })


