'use strict';

const chalk = require('chalk');
const express = require('express');
const {NodeVM,VM} = require('vm2');

var {ObjectId} = require("mongodb");
var Components = require('lib/Components.js');
var Forms = require('lib/Forms.js');
var Jobs = require('lib/Tests.js')('job');
var Components = require('lib/Components.js');
var Tests = require('lib/Tests.js')('test');
var commonSchema = require('lib/commonSchema.js');
var utils = require("../lib/utils.js");
var automaticallyCreateSchema = require("../lib/automaticallyCreateSchema.js");
var router = express.Router();

module.exports = {
  run,
  // save,
  retrieve,
  findInputRecord
};


// This function would be put in a request context, so that req and req.user and req.ip is defined.
async function run(req, jobform, processId, record, dry_run) {
  var processRecord = {
        _id: new ObjectId(), // generate now so we can save it.
        state: "failed",
        input: {
          _id: ObjectId(record._id),
          jobId: record.jobId,
          collection: record.collection,
          recordType: record.recordType,
        },
        process:{
          _id: ObjectId(jobform._id),
          formId: jobform.formId,
          collection: jobform.collection,
          processId: processId,
        },
        insertion,
        created: [],
        log: []
    };

  // Save a record immediately to lock out other users.
  if(!dry_run)
    processRecord = await startDraft(processRecord,req);

  try{
     var testform_cache = {};
     var components_to_create = [];
     var tests_to_create = [];

     // These functions are put here in this scope

     var createComponent = function(type,data) { 
      // Check for problems later.
      var new_component = {
          componentUuid: Components.newUuid(), 
          type: type, 
          data:data
      };
      components_to_create.push(new_component);
      return new_component;
    }

    var createTest = function(componentUuid,formId,data) 
    {
      var new_test = { 
        componentUuid: componentUuid,
        formId: formId,
        data:JSON.parse(JSON.stringify(data)), // deep copy, ensure no funny business.
      }
      tests_to_create.push(new_test);
      return new_test;
    }

    // The the function in a pretty secure VM sandbox. All it should know about 
    // would be the two functions above.

    //
      var log = [];
      var psuedoConsoleFn = function (){
        log.push([...arguments].join(' '));
        logger.info("LOG",...arguments);
      };

      var sandbox = {createComponent:createComponent, createTest:createTest, data:record.data}


      // vm2 VM version: this one is more restrictive and allows a timeout function.

      // Set the console commands to log.
      sandbox.console = {log:psuedoConsoleFn,
                        info:psuedoConsoleFn,
                        warn:psuedoConsoleFn,
                        error:psuedoConsoleFn,
                        dir:psuedoConsoleFn,
                        trace: ()=>{}}
      var myVM = new VM({
        console: 'redirect',
        sandbox: sandbox,
        require: false,
        eval: false,
        wasm: false,
        fixAsync: true,
        timeout: 500, //ms
      });


    // This is the NodeVM version. This one has fewer safeguards.
    // var myVM = new NodeVM({
    //   console: 'redirect',
    //   sandbox: sandbox,
    //   require: false,
    // });
    // myVM.on('logger.info', psuedoConsoleFn);
    // myVM.on('console.info', psuedoConsoleFn);
    // myVM.on('console.warn', psuedoConsoleFn);
    // myVM.on('logger.error', psuedoConsoleFn);
    // myVM.on('logger.info', psuedoConsoleFn);
    // myVM.on('console.trace', psuedoConsoleFn);

    // Run the process inside my new VM sandbox.
    // processRecord.retval = myVM.run("cosle.log(blah);");
    // logger.info("alg",process.alg);

    function saveLog() {
      if(log.length>2000) {
        var l = log.length;
        logger.info("loglength is ",l);
        log.splice(2000,l-2020,".... "+(l-2020)+" lines removed....."); // remove everythign bewtween 2000 and 20 before end
        logger.info("spliced down to ",log.length);
      }
      processRecord.log = log;
    }

    var alg = jobform.processes[processId];
    try{
      processRecord.retval = myVM.run(alg);
    } catch(e) {
      // trim log before returning
      saveLog();
      throw e;
    }

    // Success - trim log anyway.
    saveLog();
  
    logger.info("psuedologger.info:")
    logger.info(processRecord.log.join('\n'));
    logger.info("------ new components -------");
    logger.info(JSON.stringify(components_to_create,null,2));
    logger.info("------ new tests -------");
    logger.info(JSON.stringify(tests_to_create,null,2));

    var insertion = commonSchema.insertion(req);

    // This will be attached to all created records.

    var createdFrom = {
                          processRecordId: processRecord._id,
                          inputRecordType: record.recordType,
                          inputRecordId: record._id,
                          inputJobId: record.jobId,
                          inputRecordCollection: record.collection,
                        };

    var allObjects = [];

    // Create all the objects.
    for(var component of components_to_create) {
      if(!component.componentUuid) throw new Error("Function created component without a UUID: "+ JSON.stringify(component,null,2));
      if(!component.data) throw new Error("Function created component without data: "+ JSON.stringify(component,null,2));
      if(!component.type) throw new Error("Function created component without type: "+ JSON.stringify(component,null,2));
      if(!component.data.name) processRecord.log.push("Warning: Function created component without data.name: "+ JSON.stringify(component,null,2));

      component.createdFrom = createdFrom;

      var finalizedObject = component;
      if(dry_run) {
        finalizedObject.recordType = 'component';
      } else {
        finalizedObject = await Components.save(component,req);
      }
      allObjects.push(finalizedObject);

      processRecord.created.push( {
        recordType: finalizedObject.recordType,
        collection: 'components',
        _id: finalizedObject._id,
        componentUuid: finalizedObject.componentUuid,
      });

    }

    // -----------------------
    // Find all the forms needed that describe the new tests.
    // Create them if neccessary.
    // FIXME: evolve form schema if new fields present.
    var testByFormId = {};
    var formByFormId = {};
    for(var test of tests_to_create) {
      if(!test.formId) throw new Error("Function created test without a formId: "+ JSON.stringify(test,null,2));
      if(!test.data) throw new Error("Function created test without any data: "+ JSON.stringify(test,null,2));

      if(!testByFormId[test.formId]) testByFormId[test.formId] = [];
      testByFormId[test.formId].push(test);
    }

    for(var formId in testByFormId) {
      // Does this form ID exist?
      var form = await Forms.retrieve('testForms',formId);
      if(form) {
        formByFormId[formId] = form; 
        logger.info('formId',formId,'exists:',form);
      } else {
        // Use my automatic method to create a new form schema from scratch. Users
        // can modify it from there.
        var schema = automaticallyCreateSchema(testByFormId[test.formId],jobform);
        // logger.info("NEW SCHEMA",schema);
        var newform = {
          formId,
          formName: utils.deCamelCase(formId),
          schema,
          createdFrom
        };
        if(dry_run) {
          newform.recordType = 'form';
          newform.collection = "testForms";
        } else {
          newform = await Forms.save(newform,'testForms',req);
        }
        
        // save for use in a minute.
        formByFormId[formId] = newform;
        
        allObjects.push(newform);

        processRecord.created.push( {
          recordType: newform.recordType,
          collection: newform.collection,
          _id: newform._id,
          formId: newform.formId
        });
      }
    }
    
    // ----------------------------
    // Create all the new tests.
    for(var test of tests_to_create) {
      if(!test.formId) throw new Error("Function created test without a formId: "+ JSON.stringify(test,null,2));
      if(!test.data) throw new Error("Function created test without any data: "+ JSON.stringify(test,null,2));
      if(!test.componentUuid) throw new Error("Function created test without any componentUuid: "+ JSON.stringify(test,null,2));

      var newtest = test;
      test.formName = formByFormId[test.formId].formName,
      test.formObjectId = formByFormId[test.formId]._id,
      test.state = "submitted";
      test.createdFrom = createdFrom;

      var newtest = test;
      if(dry_run) {
        newtest.collection = 'testForms';
        newtest.recordType = 'test';
      } else {
        newtest = await Tests.save(test,req);
      }
      allObjects.push(newtest);

      processRecord.created.push( {
        recordType: newtest.recordType,
        collection: newtest.collection,
        _id: newtest._id,
        formId: newtest.formId,
        componentUuid: newtest.componentUuid,
      });
    }

    // finally, log this process happened.
    if(dry_run) {
      processRecord.state="draft";
    } else   {
      await deleteDraft(processRecord._id);
      delete processRecord._id;
      processRecord = await save(processRecord,req);
    }

    var retval = {...processRecord,allObjects};
    logger.info("DONE:",retval);
    logger.info("DONE");
    return retval;


  } catch(e) {
    processRecord.state='failed';
    processRecord.log.push(e.toString());
    processRecord.log.push(e.stack);
    return processRecord;
  }

}



async function startDraft(input,req)
{
  var record = {...input};
  record.insertion = commonSchema.insertion(req);
  record.recordType = "proccessed";
  record.collection = "processsed";
  record.state = "draft";
  var result = await db.collection('processed').insertOne(record);
  logger.info("processed",result.ops[0]);
  return result.ops[0];
}

async function deleteDraft(id,req)
{
  var result = await db.collection('processed').deleteOne({state:'draft',_id:ObjectId(id)});
  logger.info("deleted",result);
  return result;
}

async function save(input,req)
{
  var record = {...input};
  record.insertion = commonSchema.insertion(req);
  record.recordType = "proccessed";
  record.collection = "processsed";
  record.state = "submitted";
  var result = await db.collection('processed').insertOne(record);
  logger.info("processed",result.ops[0]);
  return result.ops[0];
}

async function retrieve(id)
{
  var q={_id:ObjectId(id)};
  var found = await db.collection("processed").findOne(q);
  return found;
}

async function findInputRecord(jobId)
{
  var query = {"input.jobId":ObjectId(jobId)};
  var found = await db.collection("processed").find(query).toArray();
  logger.info('Processes::findInputRecord',jobId,found)
  return found;
}


