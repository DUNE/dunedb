'use strict';

const chalk = require('chalk');
const express = require('express');

var Components = require('lib/Components.js');
var Forms = require('lib/Forms.js');
var Components = require('lib/Components.js');
var permissions = require('lib/permissions.js');
var Processes = require("lib/Processes.js");
const logger = require('../lib/logger');
var router = express.Router();

module.exports = router;

//////////////////////////////////////////////////////////////////////////
// Editing and creating forms


router.get("/processjob/:jobId([A-Fa-f0-9]{24})/:formRecordId([A-Fa-f0-9]{24})/:processId", permissions.checkPermission("jobs:process"), async function(req,res){
  // var form = await Forms.retrieve("jobForms",null,{id:req.params.formRecordId});
  // var job = await Jobs.retrieve(req.params.jobRecordId);

  var processId = decodeURIComponent(req.params.processId);
  let [form,pastProcesses] = await Promise.all([
      Forms.retrieve("jobForms",null,{id:req.params.formRecordId}),
      null,
      Processes.findInputRecord(req.params.jobRecordId),
  ]);

  if(!form) return res.status(400).send("No such form "+req.params.formRecordId);
  if(!job) return res.status(400).send("No such job"+req.params.jobId);
  logger.info(form);
  if(!form.processes) return res.status(400).send("No processes in that form");
  var process_to_run = form.processes[processId];
  if(!process_to_run) return res.status(400).send("No such algorithm "+processId);


  // How locking works:
  // If this is called without query paramerters, it's a dry run.
  // Dry runs do nothing but exercise the process code. Nothing committed.
  // 
  // If query has "?commit=true" then it's not a dry_run.
  // Failed processes may insert things before failing; I hope I've pre-checked
  // for all possible problems with the dry run. User COULD circumvent this will a well-crafted 'get'
  //
  // If not a dry run, then the Process system inserts a record with state:'draft'
  //  when starting the process, deleting it and replacing it with 'submitted' if finished.
  // 
  // If any process record exists, then, the system has already or is already processing this record.
  // If the user clicks the confirmation button, this script is called with
  // ?commit=true&override=true
  // which then allows the script to run again.


  // Has this record already been processed?
  // var pastProcesses = findInputRecord(req.params.jobRecordId);
  var conflict = false;
  if(!dry_run && pastProcesses && pastProcesses.length>0) {
    // Another process has already run or is running. Deny unless override.
    if(!req.query.override) {
      dry_run = true; // revert to dry run.
      conflict = true;
    }
  } 

  var dry_run = true;
  if(req.query.commit) dry_run = false;
  var result = await Processes.run(req, form, req.params.processId, job, dry_run);

  logger.info("........",result.state);
  logger.info(JSON.stringify(result,null,2));
  logger.info("........");

  if(dry_run == false && result && result.state==="submitted")
    return res.redirect('/processRecord/'+result._id.toString())

  res.render("processResult.pug",{dry_run, job, form, result, pastProcesses, conflict});


});


router.get("/processRecord/:processRecordId([A-Fa-f0-9]{24})", permissions.checkPermission("jobs:view"), async function(req,res){
    var result = await Processes.retrieve(req.params.processRecordId);
    logger.info(result);
    if(!result) return res.status(400).send("No such process record in database.");
    let [form,job,pastProcesses] = await Promise.all([
      Forms.retrieve(result.process.collection,result.process.formId,{id:result.process._id}),
      null,
      Processes.findInputRecord(result.input._id)
    ]); 
    res.render("processResult.pug",{result, form, job, pastProcesses});
});

router.get("/processRecordQRs/:processRecordId([A-Fa-f0-9]{24})", permissions.checkPermission("jobs:view"), async function(req,res){
  try{
    var result = await Processes.retrieve(req.params.processRecordId);

    var promises = [];
    for(var thing of result.created) {
      if(thing.recordType=="component") {
        promises.push(Components.retrieve(thing.componentUuid));
      }
    }
    var components = await Promise.all(promises);
    res.render("QR_sheet.pug",{result, components});
  } catch(err) {
    logger.error(err);
    return res.status(400).send(err.toString());
  }
    // logger.info("process----");
    // logger.info(result);
    // var components = [];
    // for(var thing of result.created) {
    //   if(thing.recordType==="component") 
    //     try {
    //       components.push(await Components.retrieve(thing.componentUuid));
    //     } catch(e) {

    //         logger.error(e);
    //         return res.status(400).send("Could not look up "+thing.componentUuid);
    //     }
    // }
});


// Could allow expert deletions?


