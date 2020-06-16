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
// }
// In fact, these should be JSONPath descriptions.  Evaluating these could lead to a list of thigs

// test_descriptions: {
//   <form_id>: <list_of_keys>,  -> to be used as form data.
//   <form_id>: <list of keys>
//  }

// component: {
//  type: String,
//  component_property_keys: <list_of_keys>,  -> list of keys that describe the component properties (with translations). could include a componentUuid field!
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
global.config = require('../configuration.js');
const Components = require('./Components.js'); // for newUuids.


function decompose(record, requisition, instance)
{
  instance = instance || 0;

  var type = requisition.type;


  var new_component = { type: type };
  if(requisition.component_properties) {
    for(var field in requisition.component_properties) {
      var path = requisition.component_properties[field];
      if(path === true) path = field;
      var value = jp.query(record,path)[instance];
      new_component[field] = value;
    }
  } else {
    // don't insert a new component if component properties is null? or if type is null?
  }
  new_component.componentUuid = new_component.componentUuid || Components.newUuid().toString();

  var new_components = [new_component]
  var new_tests = [];

  for(var form_id in requisition.test_descriptions) {
    var new_test = { form_id: form_id, 
                     created_from: {
                        id: record._id,
                        
                     },
                      data: {} 
                   };
    var test_desc = requisition.test_descriptions[form_id];
    for(var field in requisition.test_descriptions[form_id]) {
      var path = test_desc[field];
      if(path === true) path = field;
      var value = jp.query(record,path)[instance];
      new_test.data[field] = value;
    }
    new_test.componentUuid = new_component.componentUuid; // attach to this component.
    new_tests.push(new_test);
  }

  for(var subcomponent_name in requisition.subcomponents) {
    var subcomponent = requisition.subcomponents[subcomponent_name];
    new_component[subcomponent_name] = [];

    // Need to get the number of iterations.
    // Check everything.
    var fieldcounts = [];
    for(var field in subcomponent.component_properties) {
      var fieldcount = jp.query(record,subcomponent.component_properties[field]).length;
      if(fieldcount) fieldcounts.push(fieldcount);
    }
    for(var test in subcomponent.test_descriptions) {
      for(var field in subcomponent.test_descriptions[test]) {
        var fieldcount = jp.query(record,subcomponent.test_descriptions[test][field]).length;
        if(fieldcount) fieldcounts.push(fieldcount);
      }
    }
    var min = Math.min(...fieldcounts);
    var max = Math.max(...fieldcounts);
    if(min!=max) throw new Error("Mismatched number of fields for subcomponent "+subcomponent_name);
    console.log("Running ",max," subcomponents");

    // Now actually run them.
    for(var i = 0; i<max; i++) {
      var result = decompose(record,subcomponent,instance);
      var uuid = result.components[0].componentUuid;
      new_component[subcomponent_name].push(uuid);
      new_components.push(...result.components);
      new_tests.push(...result.tests);
    }
  }


  console.log("new component type ",type);
  console.log("-COMPONENT-")
  console.dir(new_component)
  console.log("--");
  for(var test of new_tests) {
    console.log("-TEST-")
    console.dir(test)
    console.log("--")
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

  console.log(JSON.stringify(decompose(testthing,test_requisition),null,2));

}