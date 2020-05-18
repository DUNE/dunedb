
const permissions = require('../permissions.js');
// const Jobs = require('../Jobs.js');
const Forms = require('../Forms.js');
const Tests = require('../Tests.js');

const express  = require("express");
const utils = require("../utils.js");

var router = express.Router();

module.exports = router;

// HTML/Pug routes:

async function seeTestData(req,res,next) {
  try{
    var options = {};
    if(req.query.version) options.version = parseInt(req.query.version);
    // fixme rollback
    var formrec = await Forms.retrieveForm('jobForms',req.params.form_id,options);
    var versions = await Forms.getFormVersions('jobForms',req.params.form_id);
    console.log('versions',versions);
    if(!formrec) return res.status(400).send("No such test form");  
    var data = await Tests.getTestData(req.params.form_id, req.params.record_id);
    if(!data) return res.status(404).render("No such test recorded.");
    res.render('viewTest.pug',{form_id:req.params.form_id, formrec:formrec, testdata:data, versions: versions, retrieved:true})
  } catch(err) { console.error(err); next(); }

};

router.get("/job/:form_id/:record_id", permissions.checkPermission("tests:view"), seeTestData);

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

router.get('/jobs/:form_id', permissions.checkPermission("tests:view"), 
  async function(req,res,next) {
    var tests = await Tests.listRecentTests(req.params.form_id,(req.query||{}).N);
    res.render('recentJobs.pug',{form_id:req.params.form_id, tests: tests});
  });




