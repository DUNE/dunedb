'use strict';

const MUUID = require('uuid-mongodb');
const moment = require('moment');
const jp = require('jsonpath');
const utils = require('./utils.js');
// const {JSONPath} = require('jsonpath-plus');

//
//
//  Attempts to create a form based on one or more JSON records.
//
//  FIXME: Evolve existing schema if/when new for forms are present.
//


var formComponents = 
{
  boolean: {"labelPosition": "left-right", "widget": "choicesjs", "tableView": true, "data": {   "values": [     {       "label": "true",       "value": "true"     },     {       "label": "false",       "value": "false"     }   ] }, "selectThreshold": 0.3, "key": "select1", "type": "select", "indexeddb": {   "filter": {} }, "input": true
        },
  uuid:  {  "labelPosition": "left-right", "spellcheck": false, "disabled": true, "type": "ComponentUUID", "input": true },
  number:   {   "labelPosition": "left-right", "type": "SpecNumberComponent", "input": true },
  date:  { "labelPosition": "left-right", "tableView": false, "enableMinDateInput": false, "datePicker": {   "disableWeekends": false,   "disableWeekdays": false }, "enableMaxDateInput": false, "type": "datetime", "input": true, "suffix": "<i ref=\"icon\" class=\"fa fa-calendar\" style=\"\"></i>", "widget": {   "type": "calendar",   "displayInTimezone": "viewer",   "language": "en",   "useLocaleSettings": false,   "allowInput": true,   "mode": "single",   "enableTime": true,   "noCalendar": false,   "format": "yyyy-MM-dd hh:mm a",   "hourIncrement": 1,   "minuteIncrement": 1,   "time_24hr": false,   "minDate": null,   "disableWeekends": false,   "disableWeekdays": false,   "maxDate": null }},
  textfield: {   "labelPosition": "left-right", "tableView": true, "type": "textfield","input": true},
  textarea:  { "labelPosition": "left-right", "autoExpand": false, "tableView": true, "type": "textarea", "input": true },
  container: { "tableView": false, "type": "container", "input": true, "hideLabel": false, },
  datagrid: {  "reorder": false,  "addAnotherPosition": "bottom",  "defaultOpen": false,  "layoutFixed": false,  "enableRowGroups": false,  "tableView": false,  "defaultValue": [    {}  ],  "type": "datagrid",  "input": true,  "components": []},
  // submit:   { "type": "button","label": "Submit","key": "submit","disableOnInvalid": true,"input": true, "tableView": false}
}


var timeFormats = [
  moment.ISO_8601,
  moment.HTML5_FMT.DATETIME_LOCAL,
  moment.HTML5_FMT.DATETIME_LOCAL_SECONDS,  
  moment.HTML5_FMT.DATETIME_LOCAL_MS,
  moment.HTML5_FMT.DATE,
  moment.HTML5_FMT.DATETIME_LOCAL_MS,
  "YYYY/MM/DD",
  "MM/DD/YY"
  ];


  // var v0 = input.replace(/([0-9]+)/g,' $1'); // 09 to space-09
  // var v1 = v0.split(/(?=[A-Z])/).join(' '); // split on capital letters, using lookahead, then rejoin
  // var v2 = v1.replace(/[_\-]+/,' '); // Change dashes and underscroes into spaces
  // var v3 = v2.charAt(0).toUpperCase() + v2.slice(1); // First letter uppercase.
  // return v3;
// }

'someStrange_variableNumber09'

function guessAtComponentType(values)
{
  /// 
  /// For an array of values, find the most likely kinds of component it corresponds to.
  /// A single item should be specifed as a 1-element array, e.g. ['a string']
  ///
  var couldBeBoolean = true;
  var couldBeUuid   = true;
  var couldBeNumber = true;
  var couldBeDate   = true;
  // var couldBeUrl   = true;
  // var couldBeEmail   = true;
  var couldBeShortString = true;
  var couldBeLongString = true; // this is the last fallback.

  for(var value of values) {

    // order of operations here is important!

    // check if value is null
    if(value===null) continue; // no idea.
    if(value===undefined) continue;

    // check for value is array
    if(Array.isArray(value)) return 'array'; 

    // check for value is obj
    if(typeof value === 'object') return 'object'; 

    if(typeof value !== 'boolean') couldBeBoolean = false;
    var uuidLike = true;
    try { MUUID.from(value); } catch(e) { uuidLike = false; } // not an UUID if it throws.
    if(!uuidLike) couldBeUuid = false;

    var numberLike = (typeof(value)=='number')  // its a number type
                    || (parseFloat(value.toString()).toString() === value.toString()); // parsing value->float->string gives same as parsing to string
    if(!numberLike) couldBeNumber = false;

    var dateLike = moment(value,timeFormats,true).isValid();
    if(!dateLike) couldBeDate = false;

    if(value.toString().length>80) couldBeShortString = false;
  }

  if(couldBeBoolean) return 'boolean';
  if(couldBeUuid) return 'uuid';
  if(couldBeNumber) return 'number';
  if(couldBeDate) return 'date';
  if(couldBeShortString) return 'textfield';
  if(couldBeLongString) return 'textarea'; // Fallback.
  return null; // no idea.
}

function autoSchemaCreator(documents, sourceMap, recurse)
{
  // for a list of assumedly-identical documents, create a form.
  // Even one document is enough.

  // First, find all the values in the document. This is simple for Key-value-pair documents, but
  // more complex if there is structure.
  // Concatenate for all documents.
  var paths = {};
  for(var document of documents) {
    if(document) {
      var docpaths = jp.paths(document,"$.*"); // Get all nodes
      // for each node, add to master list.
      for(var p of docpaths) {
        var str = jp.stringify(p);
        paths[str] = p; // add to list
      }
    }
  }
  var components = [];
  for(var path in paths) {
    // Ok! Let's get to it.

    // First, create a list of all the values
    var values = [];
    for(var document of documents)
     if(document) values.push(jp.value(document,path));
    // evaluate them.
    var mytype = guessAtComponentType(values);
    var component; 
    console.log(path,mytype);
    if(mytype === 'array') {
      var allvalues = [];
      for(var val of values) {
        if(Array.isArray(val)) allvalues.push(...val);
      }
      var arrtype = guessAtComponentType(allvalues);
      // If these are each objects, we know we actually want to serialize them into a DataGrid.
      if(arrtype==='object') {
        component = JSON.parse(JSON.stringify(formComponents.datagrid));
        // recurse.
        component.components = autoSchemaCreator(allvalues,true).components;
      } else {
        continue;
      }
    } else if (mytype === 'object') {
      // fixme: look for data: [<numbers].  If it's there, make this an ArrayComponent

      // Let's recurse.        
      component = JSON.parse(JSON.stringify(formComponents['container'])); // Deep copy
      component.components = autoSchemaCreator(values,true).components;

    } else {
      component = JSON.parse(JSON.stringify(formComponents[mytype])); // Deep copy
    }
    
    var patharr = paths[path];
    var component_key = patharr[patharr.length-1];
    // Look for any matching component keys in the source. Does any
    // component have this particular key?
    if(sourceMap[component_key]) {
      // Yup, there is at least one. Let's ensure it's the best one.
      var matchComponent = findBestMatch(sourceMap[component_key],path);
      if(matchComponent) component = {...matchComponent};
      component.labelPosition = "left-right"; // Probably better in most cases.
    }


    component.key = component_key;
    component.label = utils.deCamelCase(component.key);

    // OK, we have something that WORKS... but I'd rather have something from the source.


    components.push(component);
  }
  // if(!recurse) components.push(formComponents.submit);
  return {components:components};
}


function findBestMatch(submap, path)
{
  // Submap is an object with 
  // { path1.to.key: <{component}>, path2.to.key: <(component>) }
  // path is an array leading to a partiular data object, i.e. [tubes,0,tubeNumber]
  console.log("findBestMatch",Object.keys(submap),path);
  var best_match_component = null;
  var best_match_path = null;
  var best_match_score = -1;
  for(var schemaPathStr in submap) {
    var schemaPath = schemaPathStr.split('.');
    // find elements common to both paths.
    var common = [];
    for(var p of path)
      if(schemaPath.includes(p)) common.push(p);

    // simple version: just count number of matching words, regardless of order.
    var score = common.length;

    if(score>best_match_score) {
      best_match_score = score;
      best_match_path = schemaPathStr;
      best_match_component = submap[schemaPathStr];
    }
  }
  console.log("  best was ",schemaPathStr,best_match_component)
  return best_match_component;
}

function mapSourceForm(sourceForm)
{
  //
  // returns a map of maps:
  //  key1 : path1.to.key1 : { - component - }
  //         path2.to.key1 : { - component - }
  // 
  var map = {};
  function recurse(schema,path) {
    if(schema.components){
      for(var c of schema.components) {
        recurse(c,[...path,c.key]);
      }
    } else {
      var key = path[path.length-1]; // last element of path.
      map[key] = map[key] || {}; 
      map[key][path.join('.')] = schema;
    }
  }
  if(sourceForm && sourceForm.schema)
    recurse(sourceForm.schema,[]);
  return map;
}


function automaticallyCreateSchema(records,sourceForm) {
  var documents = [];
  var sourceMap = mapSourceForm(sourceForm);
  for(var record of records) {
    if(record.data) documents.push(record.data);
  }
  return autoSchemaCreator(documents,sourceMap,false);
}

module.exports = automaticallyCreateSchema;



/// Unit test code:
if (typeof require !== 'undefined' && require.main === module) 
{


  var longstring = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";
  var docs = [
    {data:{ a: 1, b: "one", c:'2012-01-04', d: longstring, e: 'eb86e550-a9c1-11ea-bbcc-8dda7beedcce' }},
    {data:{ a: 2.3, b: "two", c:'05/04/19', d: longstring,   e: 'eb000000-a9c1-11ea-bbcc-8dda7beedcce' }},
    {data:{ a: "NaN", b: "two", c:'05/04/19', d: longstring,   e: 'eb000000-a9c1-11ea-bbcc-8dda7beedcce' }},
    {data:{
      obj: { o1: 1, o2: "two" },
      arr: [ {serial: 1, measure:2},{serial:2,measure:3} ],
    }},
  ];


  // console.log(jp.paths(testthing,"$.*"))

  console.log(JSON.stringify(automaticallyCreateSchema(docs),null,2));
}