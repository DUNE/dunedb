'use strict';
//
//
//
// We create a workflow record that records object properties for the first time.
//
// Then we want to split it off into multiple components, one main component
// and then a bunch of subcomponents.
// We'll define all these using JSON paths.


// First find the main component.
//   - do we have a UUID defined? If so, use that
//   - find all fields associated with the main component and use them to create the main component
// Find the parts
//   - Which fields contain the arrays of parts?
//   - Which parts of the array contain the object information
//   - Which parts of the array contain the initial test information?
//
// - Create the componenent form?  - no, do that only if it doesn't exist. (Requires me
//   to rebuild the componentForm into many forms, which I should do anyway.)
// - Create the test info form?  - do it only if it doesn't exist
// 
//
// list_of_keys:
// { <output_key>: true, 
//   <output_key>: <from key path>
//   <output_key>: function   -> Form function(record,instance,jsonpath_library) { return value };
// }
// In fact, these should be JSONPath descriptions.  Evaluating these could lead to a list of thigs

// test_descriptions: {
//   <formId>: <list_of_keys>,  -> to be used as form data.
//   <formId>: <list of keys>
//  }

// component: {
//  type: String,
//  component_property_keys: <list_of_keys>,  -> list of keys that describe the component properties (with translations). could (should?) include a componentUuid field!
//  test_descriptions: <test_descriptions>,
//  subcomponents[
//    {
//      to_key_path:   // where to save the component uuid in this object. 
//      <component>
//
//    }
//  ]
//}
// requisition: [components] or component

const jp = require('jsonpath');
const Components = require('lib/Components.js')('component'); // for newUuids.
const {NodeVM} = require('vm2');

function decompose(record, requisition, instance)
{
  instance = instance || 0;

  var type = requisition.type;
  var data = record.data;


  var new_component = { type: type };
  if(requisition.component_properties) {
    for(var field in requisition.component_properties) {
      var path = requisition.component_properties[field];
      var value = undefined;
      if(path === true)              value = jp.query(data,field)[instance]
      if(typeof path === 'string')   value = jp.query(data,path)[instance];
      if(typeof path === 'function') value = path(data,instance,jp); 
      if(value !== undefined) new_component[field] = value;
    }
  } else {
    // don't insert a new component if component properties is null? or if type is null?
  }
  new_component.componentUuid = new_component.componentUuid || Components.newUuid().toString();

  var new_components = [new_component]
  var my_tests = [];

  for(var formId in requisition.test_descriptions) {
    var new_test = { formId: formId, 
                     created_from: {
                        id: record._id,
                        recordType: record.recordType
                        
                     },
                     recordType: 'test',
                      data: {} 
                   };
    var test_desc = requisition.test_descriptions[formId];
    for(var field in requisition.test_descriptions[formId]) {
      var path = test_desc[field];
      var value = undefined;
      if(path === true)              value = jp.query(data,field)[instance]
      if(typeof path === 'string')   value = jp.query(data,path)[instance];
      if(typeof path === 'function') value = path(data,instance,jp); 
      if(value !== undefined) new_test.data[field] = value;
    }
    my_tests.componentUuid = new_component.componentUuid; // attach to this component.
    my_tests.push(new_test);
  }
  var new_tests = [...my_tests];

  for(var subcomponent_name in requisition.subcomponents) {
    var subcomponent = requisition.subcomponents[subcomponent_name];
    new_component[subcomponent_name] = [];

    // Need to get the number of iterations.
    // Check everything.
    var fieldcounts = [];
    for(var field in subcomponent.component_properties) {
      logger.info("field",field,subcomponent.component_properties[field]);
      if(typeof subcomponent.component_properties[field] === 'string') { 
        var fieldcount = jp.query(data,subcomponent.component_properties[field]).length;
        if(fieldcount) fieldcounts.push(fieldcount);
        logger.info(" ---> count ",fieldcount);
      }
    }
    for(var test in subcomponent.test_descriptions) {
      for(var field in subcomponent.test_descriptions[test]) {
        if(typeof subcomponent.test_descriptions[test] === 'string') {
          var fieldcount = jp.query(data,subcomponent.test_descriptions[test][field]).length;
          if(fieldcount) fieldcounts.push(fieldcount);
        }
      }
    }
    var min = Math.min(...fieldcounts);
    var max = Math.max(...fieldcounts);
    if(min!=max) {
      logger.info("blah",...fieldcounts);
      throw new Error("Mismatched number of fields for subcomponent "+subcomponent_name);
    }
    logger.info("Running ",max," subcomponents");

    // Now actually run them.
    for(var i = 0; i<max; i++) {
      var result = decompose(record,subcomponent,i);
      var uuid = result.components[0].componentUuid; // first one is our descendent, may be more that are subdescendents.

      new_component[subcomponent_name].push(uuid);
      new_components.push(...result.components);
      new_tests.push(...result.tests);
    }
  }

  logger.info("xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
  logger.info("new component type ",type);
  logger.info("-COMPONENT-")
  logger.info(new_component)
  logger.info("--");
  for(var test of my_tests) {
    logger.info("-TEST-")
    logger.info(test)
    logger.info("--")
  }


  return {components: new_components, tests: new_tests};

}

/// Unit test code:
if (typeof require !== 'undefined' && require.main === module) 
{


  var testthing = 
  {
    packageSerialNumber: 123,
    packageName: "thePackageName",
    unpacked_date: (new Date()).toISOString(),
    packageInfo: { arr:[1,2,3], specific: "spec" },
    parcelDataMap: [
      {
        parcelName: 'a',
        parcelSerial: '001',
        width: '11'
      },
          {
        parcelName: 'b',
        parcelSerial: '002',
        width: '12'
      },
      {
        parcelName: 'c',
        parcelSerial: '003',
        width: '13'
      }
    ]
  }

  var test_requisition = 
  {
    type: 'package',
    component_properties: 
      {
        packageSerialNumber: true,
        "name": "packageName",
        "packageInfo": true,
        "specValue" : "packageInfo.specific",
      },
    test_descriptions: {
      unpackaging: {
        unpacked_date: true,
      },
    },
    subcomponents: {
      'parcels': {
              type:"parcel",
              component_properties: {
                "name" : "parcelDataMap[*].parcelName",
                "serial": "parcelDataMap[*].parcelSerial",
              },
              test_descriptions: {
                "unpacking_test" : {
                  "width": "parcelDataMap[*].width"
                },
              },

            }
    }

  };

  // logger.info(JSON.stringify(decompose(testthing,test_requisition),null,2));

  const decomp_4x4 = {
    type: 'package',
    component_properties: 
      {
        vendor: true,
        po: true,
        orderDate: true,
        supplierPo: true,
      },
    test_descriptions: {},

    subcomponents: {
      'tubes': {
              type:"steel tube 4x4",
              component_properties: {
                // "heatNumber": "tubes[0].heatNumber",
                // "caseCoilOrOtherId": "tubes[0].caseCoilOrOtherId",
                "name" : (record,instance)=>{ return "Tube " + jp.query(record,"tubes[0].tubes1[*].tubeNumber",instance);},
                "tubeNumber" : "tubes[0].tubes1[*].tubeNumber",
              },
              test_descriptions: {
                "tube_test" : {
                    "materialCondition" : 'tubes[0].tubes1[*].materialCondition',
                    "checks" : "tubes[0].tubes1[*].checks",
                    "weldCondition" : "tubes[0].tubes1[*].weldCondition",
                    "tubeNumber" : "tubes[0].tubes1[*].tubeNumber",
                    "wallThicknessRefEnd1" : "tubes[0].tubes1[*].wallThicknessRefEnd1",
                    "wallThicknessRefEnd2" : "tubes[0].tubes1[*].wallThicknessRefEnd2",
                    "wallThicknessFarEnd1" : "tubes[0].tubes1[*].wallThicknessFarEnd1",
                    "cornerRadiusOppASection" : "tubes[0].tubes1[*].cornerRadiusOppASection",
                    "cornerRadiusOppAFlat" : "tubes[0].tubes1[*].cornerRadiusOppAFlat",
                    "cornerRadiusOppBSection" : "tubes[0].tubes1[*].cornerRadiusOppBSection",
                    "cornerRadiusOppBFlat" : "tubes[0].tubes1[*].cornerRadiusOppBFlat",
                    "cornerRadiusASection" : "tubes[0].tubes1[*].cornerRadiusASection",
                    "cornerRadiusAFlat" : "tubes[0].tubes1[*].cornerRadiusAFlat",
                    "cornerRadiusBSection" : "tubes[0].tubes1[*].cornerRadiusBSection",
                    "cornerRadiusBFlat" : "tubes[0].tubes1[*].cornerRadiusBFlat",
                    "length" : "tubes[0].tubes1[*].length",
                    "xsec_ref30_p1" : "tubes[0].tubes1[*].xsec_ref30_p1",
                    "xsec_ref30_p2" : "tubes[0].tubes1[*].xsec_ref30_p2",
                    "xsec_ref30_p3" : "tubes[0].tubes1[*].xsec_ref30_p3",
                    "xsec_ref30_p4" : "tubes[0].tubes1[*].xsec_ref30_p4",
                    "xsec_ref30_p5" : "tubes[0].tubes1[*].xsec_ref30_p5",
                    "xsec_ref30_p6" : "tubes[0].tubes1[*].xsec_ref30_p6",
                    "xsec_ref30_p7" : "tubes[0].tubes1[*].xsec_ref30_p7",
                    "xsec_ref30_p8" : "tubes[0].tubes1[*].xsec_ref30_p8",
                    "xsec_ref30_p9" : "tubes[0].tubes1[*].xsec_ref30_p9",
                    "xsec_ref305_p1" : "tubes[0].tubes1[*].xsec_ref305_p1",
                    "xsec_ref305_p2" : "tubes[0].tubes1[*].xsec_ref305_p2",
                    "xsec_ref305_p3" : "tubes[0].tubes1[*].xsec_ref305_p3",
                    "xsec_ref305_p4" : "tubes[0].tubes1[*].xsec_ref305_p4",
                    "xsec_ref305_p5" : "tubes[0].tubes1[*].xsec_ref305_p5",
                    "xsec_ref305_p6" : "tubes[0].tubes1[*].xsec_ref305_p6",
                    "xsec_ref305_p7" : "tubes[0].tubes1[*].xsec_ref305_p7",
                    "xsec_ref305_p8" : "tubes[0].tubes1[*].xsec_ref305_p8",
                    "xsec_ref305_p9" : "tubes[0].tubes1[*].xsec_ref305_p9",
                    "xsec_ref580_p1" : "tubes[0].tubes1[*].xsec_ref580_p1",
                    "xsec_ref580_p2" : "tubes[0].tubes1[*].xsec_ref580_p2",
                    "xsec_ref580_p3" : "tubes[0].tubes1[*].xsec_ref580_p3",
                    "xsec_ref580_p4" : "tubes[0].tubes1[*].xsec_ref580_p4",
                    "xsec_ref580_p5" : "tubes[0].tubes1[*].xsec_ref580_p5",
                    "xsec_ref580_p6" : "tubes[0].tubes1[*].xsec_ref580_p6",
                    "xsec_ref580_p7" : "tubes[0].tubes1[*].xsec_ref580_p7",
                    "xsec_ref580_p8" : "tubes[0].tubes1[*].xsec_ref580_p8",
                    "xsec_ref580_p9" : "tubes[0].tubes1[*].xsec_ref580_p9",
                    "straightnessDatumB" : "tubes[0].tubes1[*].straightnessDatumB",
                    "straightnessDatumA" : "tubes[0].tubes1[*].straightnessDatumA",

                },
              },

            }
    }

  };


// This function would be put in a request context, so that req and req.user and req.ip is defined.
function runDecompositionFunction(decomp_function, record) {

   var created_components = [];
   var created_tests = [];

   var createComponent = function(data) { 
    // returns component record, including uuid if not specified.
    var new_component = {...data};
    if(!new_component.type) throw new Error("No component type specified to createComponent");

    new_component.created_from= {
                        id: record._id,
                        recordType: record.recordType
                     };
    new_component.componentUuid = new_component.componentUuid || Components.newUuid().toString();

    logger.info("----------------created component");
    created_components.push(new_component);

    return new_component;
  }

  var createTest = function(datarec) 
  {
    // this stuff will actually be done by Tests.saveTestData
    const new_test = {...datarec};
    if(!new_test.formId) throw new Error("No formId provided to createTest");
    // const inserted_id = Tests.saveTestData(datarec,req.ip,req.user);
    // const new_test = Tests.getTestData(inserted_id);

    logger.info("----------------created test");
    created_tests.push(new_test);
    return new_test;
  }

  // var retval = decomp_function(createComponent,createTest,record.data);
  
  // The the function in a pretty secure VM sandbox. All it should know about 
  // would be the two functions above.
  var myVM = new NodeVM({
    console: 'redirect',
    sandbox: { createComponent, createTest, jobdata:record.data },
    require: false,
    timeout: 5000, //ms
  });
  var psuedoConsole = [];
  var psuedoConsoleFn = (msg)=>{psuedoConsole.push(msg);};
  myVM.on('logger.info', psuedoConsoleFn);
  myVM.on('console.info', psuedoConsoleFn);
  myVM.on('console.warn', psuedoConsoleFn);
  myVM.on('logger.error', psuedoConsoleFn);
  myVM.on('logger.info', psuedoConsoleFn);
  myVM.on('console.trace', psuedoConsoleFn);



  var retval = myVM.run(decomp_function);
  logger.info('decomp function returned ',retval);
  logger.info("psuedoconsole returned",psuedoConsole);

  logger.info("------ new components -------");
  logger.info(JSON.stringify(created_components,null,2));
  logger.info("------ new tests -------");
  logger.info(JSON.stringify(created_tests,null,2));
}


function de4x4(createComponent,createTest,jobdata) 
{
  // logger.info(JSON.stringify(jobdata,null,2));
  logger.info('db',db);
  return;
  var tube_component_list = [];
  // Find all heats
  for(var heat of jobdata.tubes) {
    // find all tubes in heat
    for(var tube of heat.tubes1) {
      var tubeComponent = createComponent({
          type: 'Steel Tube 4x4',
          name: 'Steel Tube 4x4 ' + tube.tubeNumber,
          heatNumber: heat.heatNumber,
          caseCoilOrOtherId: heat.caseCoilOrOtherId,
      });
      tube_component_list.push(tubeComponent.componentUuid);

      var tubeTest = createTest({
        formId: "tube_unpacking_4x4",
        data: {
          ...tube,
          componentUuid: tubeComponent.componentUuid,
          heatNumber: heat.heatNumber,
          caseCoilOrOtherId: heat.caseCoilOrOtherId,
        }
      });

    }
  }
  // copy all high-level stuff into shipment comp.
  var shipment = {...jobdata};
  delete shipment.tubes;
  shipment.type = 'Steel Tube 4x4 Shipment';
  shipment.name = 'Steel Tube 4x4 Shipment PO' + jobdata.po;
  shipment.tubes = tube_component_list

  createComponent(shipment);

}


var decomp_fn_text = `
  // logger.info(JSON.stringify(jobdata,null,2));
  logger.info('HI THERE FROM INSIDE THE VM');
  var tube_component_list = [];
  // Find all heats
  for(var heat of jobdata.tubes) {
    // find all tubes in heat
    for(var tube of heat.tubes1) {
      var tubeComponent = createComponent({
          type: 'Steel Tube 4x4',
          name: 'Steel Tube 4x4 ' + tube.tubeNumber,
          heatNumber: heat.heatNumber,
          caseCoilOrOtherId: heat.caseCoilOrOtherId,
      });
      tube_component_list.push(tubeComponent.componentUuid);

      var tubeTest = createTest({
        formId: 'tube_unpacking_4x4',
        data: {
          ...tube,
          componentUuid: tubeComponent.componentUuid,
          heatNumber: heat.heatNumber,
          caseCoilOrOtherId: heat.caseCoilOrOtherId,
        }
      });

    }
  }
  // copy all high-level stuff into shipment comp.
  var shipment = {...jobdata};
  delete shipment.tubes;
  shipment.type = 'Steel Tube 4x4 Shipment';
  shipment.name = 'Steel Tube 4x4 Shipment PO' + jobdata.po;
  shipment.tubes = tube_component_list

  createComponent(shipment);
  logger.info('HI THERE FROM INSIDE THE VM');

`;


  const ObjectID = require('mongodb').ObjectID;
  const database = require("lib/database.js");
  database.attach_to_database().then(async function(){

    var record = await db.collection("jobs").findOne({_id:ObjectID('5ef264101bb6da203b27fb3c')});
    // logger.info(JSON.stringify(record,null,2));
    // decompose(record,  decomp_4x4);

    runDecompositionFunction(decomp_fn_text,record);




  }).finally(()=>{database.shutdown()});
}