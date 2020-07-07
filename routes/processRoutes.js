'use strict';

const chalk = require('chalk');
const express = require('express');
const {NodeVM} = require('vm2');

var Components = require('../lib/Components.js');
var Forms = require('../lib/Forms.js');
var Jobs = require('../lib/Tests.js')('job');
var Components = require('../lib/Components.js');
var permissions = require('../lib/permissions.js');
var Processes = require("../lib/Processes.js");
var router = express.Router();

module.exports = router;

//////////////////////////////////////////////////////////////////////////
// Editing and creating forms


router.get("/processjob/:jobRecordId([A-Fa-f0-9]{24})/:formRecordId([A-Fa-f0-9]{24})/:processId(\\w+)", permissions.checkPermission("jobs:process"), async function(req,res){
  var form = await Forms.retrieve("jobForms",null,{id:req.params.formRecordId});
  var job = await Jobs.retrieve(req.params.jobRecordId);
  if(!form) return res.status(400).send("No such form "+req.params.formRecordId);
  if(!job) return res.status(400).send("No such job"+req.params.jobRecordId);
  console.log(form);
  if(!form.processes) return res.status(400).send("No processes in that form");
  var process_to_run = form.processes[req.params.processId];
  if(!process_to_run) return res.status(400).send("No such algorithm "+req.params.processId);

  var dry_run = true;
  if(req.query.commit) dry_run = false;
  var result = await Processes.run(req, form, req.params.processId, job, dry_run);

  console.log("........",result.state);
  console.log(JSON.stringify(result,null,2));
  console.log("........");

  if(dry_run == false && result && result.state==="submitted")
    return res.redirect('/processRecord/'+result._id.toString())

  res.render("processResult.pug",{dry_run, job, form, result});


});


router.get("/processRecord/:processRecordId([A-Fa-f0-9]{24})", permissions.checkPermission("jobs:view"), async function(req,res){
    var result = await Processes.retrieve(req.params.processRecordId);
    console.log(result);
    if(!result) return res.status(400).send("No such process record in database.");
    let form = await Forms.retrieve(result.process.collection,result.process.formId,{id:result.process._id});
    let job  = await Jobs.retrieve(result.input._id);
    res.render("processResult.pug",{result, form, job});
});



