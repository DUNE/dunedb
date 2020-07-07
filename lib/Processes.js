'use strict';

const chalk = require('chalk');
const express = require('express');
const {NodeVM} = require('vm2');

var {ObjectId} = require("mongodb");
var Components = require('../lib/Components.js');
var Forms = require('../lib/Forms.js');
var Jobs = require('../lib/Tests.js')('job');
var Components = require('../lib/Components.js');
var Tests = require('../lib/Tests.js')('test');
var Jobs = require('../lib/Tests.js')('job');
var permissions = require('../lib/permissions.js');
var commonSchema = require('../lib/commonSchema.js');
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

     var createComponent = function(data) { 
      // Check for problems later.
      var uuid = Components.newUuid();
      var new_component = {componentUuid: uuid, data:data};
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

    // Deep copy data, to ensure caller can't get anything.
    var sandbox = {createComponent:createComponent, createTest:createTest, data:record.data}

    var myVM = new NodeVM({
      console: 'redirect',
      sandbox: sandbox,
      require: false,
      timeout: 5000, //ms
    });
    var psuedoConsoleFn = function (){
      processRecord.log.push([...arguments].join(' '));
      console.log("LOG",...arguments);
    };
    myVM.on('console.log', psuedoConsoleFn);
    myVM.on('console.info', psuedoConsoleFn);
    myVM.on('console.warn', psuedoConsoleFn);
    myVM.on('console.error', psuedoConsoleFn);
    myVM.on('console.dir', psuedoConsoleFn);
    myVM.on('console.trace', psuedoConsoleFn);

    // Run the process inside my new VM sandbox.
    // processRecord.retval = myVM.run("cosle.log(blah);");
    // console.log("alg",process.alg);
    var alg = jobform.processes[processId];
    processRecord.retval = myVM.run(alg);

    console.log("psuedoconsole log:")
    console.log(processRecord.log.join('\n'));
    console.log("------ new components -------");
    console.log(JSON.stringify(components_to_create,null,2));
    console.log("------ new tests -------");
    console.log(JSON.stringify(tests_to_create,null,2));

    var insertion = commonSchema.insertion(req);

    // This will be attached to all created records.

    var createdFrom = {
                          processRecordId: processRecord._id,
                          inputRecordType: record.recordType,
                          inputRecordId: record._id,
                          inputRecordCollection: record.collection,
                        };

    var allObjects = [];

    // Create all the objects.
    for(var component of components_to_create) {
      if(!component.componentUuid) throw new Error("Function created component without a UUID: "+ JSON.stringify(component,null,2));
      if(!component.data) throw new Error("Function created component without data: "+ JSON.stringify(component,null,2));
      if(!component.data.type) throw new Error("Function created component without data.type: "+ JSON.stringify(component,null,2));
      component.createdFrom = createdFrom;

      var finalizedObject = component;
      if(dry_run) {
        finalizedObject.recordType = 'component';
      } else {
        finalizedObject = await Components.saveComponent(component,req);
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
        console.log('formId',formId,'exists:',form);
      } else {
        // Use my automatic method to create a new form schema from scratch. Users
        // can modify it from there.
        var schema = automaticallyCreateSchema(testByFormId[test.formId]);
        // console.log("NEW SCHEMA",schema);
        var newform = {
          formId,
          formName: formId,
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
    console.log("DONE:",retval);
    console.log("DONE");
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
  console.log("processed",result.ops[0]);
  return result.ops[0];
}

async function deleteDraft(id,req)
{
  var result = await db.collection('processed').deleteOne({state:'draft',_id:ObjectId(id)});
  console.log("deleted",result);
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
  console.log("processed",result.ops[0]);
  return result.ops[0];
}

async function retrieve(id)
{
  var q={_id:ObjectId(id)};
  var found = await db.collection("processed").findOne(q);
  return found;
}

async function findInputRecord(input_id)
{
  var query = {"input._id":ObjectId(input_id)};
  var found = await db.collection("processed").find(query).toArray();
  console.log('Processes::findInputRecord',input_id,found)
  return found;
}


