
const permissions = require('../permissions.js');
const Jobs = require('../Jobs.js');
const Forms = require('../Forms.js');
const express  = require("express");
const utils = require("../utils.js");

var router = express.Router();

module.exports = router;

// HTML/Pug routes:

async function seeJobData(req,res,next) {
  var workflowrec = await Forms.retrieveForm('jobForms',req.params.form_id);
  if(!workflowrec) return res.status(400).send("No such job workflow");  
  var data = await Jobs.getJobData(req.params.form_id, req.params.record_id);
  if(!data) res.status(404).render("No such job recorded.");
  res.render('viewJob.pug',{form_id:req.params.form_id, workflowrec:workflowrec, jobdata:data, retrieved:true})
};

router.get("/job/:form_id/:record_id", permissions.checkPermission("jobs:view"), seeJobData);
router.get("/"+ utils.uuid_regex + "/job/:form_id/:record_id", permissions.checkPermission("jobs:view"), seeJobData);


// Run a new job, but no UUID specified

/// Run an new job
router.get("/job/:form_id",permissions.checkPermission("jobs:submit"),async function(req,res,next){
  try{
    console.log("run a new job");
    var workflow = await Forms.retrieveForm('jobForms',req.params.form_id);
    if(!workflow) return res.status(400).send("No such job workflow");
    res.render('job.pug',{form_id:req.params.form_id, form:workflow, jobdata:{data:{}}});
  } catch(err) { console.error(err); next(); }
});

// router.get("/job/:form_id",permissions.checkPermission("jobs:submit"),async function(req,res,next){
//   var workflow = await Forms.retrieveForm(req.params.form_id,'jobForms');
//   res.render('job_without_uuid.pug',{form_id:req.params.form_id,workflow:workflow});
// })

// /// Run an new job

// router.get("/"+utils.uuid_regex+"/job/:form_id", permissions.checkPermission("jobs:submit"),
// async function(req,res,next) {
//   try{
//     console.log("run a new job");
//     var workflow = await Forms.retrieveForm(req.params.workflow_id,'jobForms');
//     if(!workflow) return res.status(400).send("No such job workflow");
//     res.render('job.pug',{form_id:req.params.form_id, workflow:workflow, jobdata:{data:{componentUuid: req.params.uuid}}})
//   } catch(err) { console.error(err); next(); }
// });

