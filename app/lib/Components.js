const Binary = require('mongodb').Binary;
const MUUID = require('uuid-mongodb');
const ShortUUID = require('short-uuid');

const commonSchema = require('./commonSchema');
const { db } = require('./db');
const dbLock = require('./dbLock');
const Forms = require('./Forms');
const permissions = require('./permissions');


/// Generate a new component UUID
function newUuid() {
  // Ideally, we want to satisfy as many of the following criteria as possible in a good UUID:
  //  - a) zero collision chance
  //  - b) include some timestamp or other metadata
  //  - c) first characters to be unique as possible, so that auto-complete works well
  //
  // This is a conundrum ... UUID.v1() is in principle entirely based on generation time and MAC address, so it does a) and b), but not c)
  // On the other hand, UUID.v4 satisifies c) but not a) or b)
  // ObjectId is close - it uses high bits for time, medium bits are random, and low bits are sequential-ordering to prevent conflict
  // But the plot thickens - the UUID.v1() generation code cheats ns and MAC code, and also actually puts the medium time in the high bits, meaning they are in fact semi-random when not generated simultaneously!

  return MUUID.v1();
}


/// Save a new or edited component record
async function save(input, req) {
  // Check that the user has permission to create and edit components
  if (!permissions.hasPermission(req, 'components:edit')) throw new Error(`Components::save() - you do not have permission [components:edit] to create and/or edit components!`);

  // Check that the minimum required component information has been provided
  //   - the component UUID
  //   - the component type form ID
  //   - user-provided data (may be empty of content, but must still exist)
  if (!(input instanceof Object)) throw new Error(`Components::save() - the 'input' object has not been specified!`);
  if (!input.hasOwnProperty('componentUuid')) throw new Error(`Components::save() - the 'input.componentUuid' has not been specified!`);
  if (!input.hasOwnProperty('formId')) throw new Error(`Components::save() - the 'input.formId' has not been specified!`);
  if (!input.hasOwnProperty('data')) throw new Error(`Components::save() - the 'input.data' has not been specified!`);

  // Check that there is an existing type form corresponding to the the provided type form ID
  const typeFormsList = await Forms.list('componentForms');
  const typeForm = typeFormsList[input.formId];

  if (!typeForm) throw new Error(`Components:save() - the specified 'input.formId' (${input.formId}) does not match a known component type form!`);

  // Set up a new record object, and immediately add information, either directly or inherited from the 'input' object
  // If no type form name has been specified in the 'input' object, use the value from the type form instead
  let newRecord = {};

  newRecord.recordType = 'component';
  newRecord.componentUuid = MUUID.from(input.componentUuid);
  newRecord.shortUuid = ShortUUID().fromUUID(input.componentUuid);
  newRecord.formId = input.formId;
  newRecord.formName = input.formName || typeForm.formName;
  newRecord.data = input.data;

  if (input.workflowId) newRecord.workflowId = input.workflowId;

  // Generate and add an 'insertion' field to the new record
  newRecord.insertion = commonSchema.insertion(req);

  let _lock = await dbLock(`saveComponent_${newRecord.componentUuid}`, 1000);

  // Attempt to retrieve an existing record with the same component UUID as the specified one (relevant if we are editing an existing record)
  let oldRecord = null;

  if (input.componentUuid) oldRecord = await retrieve(input.componentUuid);

  // Generate and add a 'validity' field to the new record, either from scratch (for a new record), or via incrementing that of the existing record (if editing)
  newRecord.validity = commonSchema.validity(oldRecord);
  newRecord.validity.ancestor_id = input._id;

  if (input.reception) newRecord.reception = input.reception;

  // Insert the new record into the 'components' records collection, and throw an error if the insertion fails
  const result = await db.collection('components')
    .insertOne(newRecord);

  _lock.release();

  if (!result.acknowledged) throw new Error(`Components::save() - failed to insert a new component record into the database!`);

  // If the insertion is successful, return the record's component UUID (in string format) as confirmation
  return MUUID.from(newRecord.componentUuid).toString();
}


/// Update the most recently logged reception location and date of a single component
async function updateLocation(componentUuid, location, date) {
  // Set up the DB query match condition to be that a record's component UUID must match the specified one
  let match_condition = { componentUuid };

  if (typeof componentUuid === 'object' && !(componentUuid instanceof Binary)) match_condition = componentUuid;

  match_condition.componentUuid = MUUID.from(match_condition.componentUuid);

  // Use the MongoDB '$set' operator to directly edit the values of the relevant fields in the component record, and throw an error if the edit fails
  const result = db.collection('components')
    .findOneAndUpdate(
      match_condition,
      {
        $set: {
          'reception.location': location,
          'reception.date': date,
        }
      },
      {
        sort: { 'validity.version': -1 },
        returnNewDocument: true,
      },
    );

  if (result.ok === 0) throw new Error(`Components::updateLocation() - failed to update the component record!`);

  // If the edit is successful, return the status of the 'result.ok' property (which should be 1)
  return result.ok;
}


/// Retrieve a single version of a component record (either the most recent, or a specified one)
async function retrieve(componentUuid, projection) {
  // Set up the DB query match condition to be that a record's component UUID must match the specified one, and throw an error if no component UUID has been specified
  let match_condition = { componentUuid };

  if (typeof componentUuid === 'object' && !(componentUuid instanceof Binary)) match_condition = componentUuid;

  if (!match_condition.componentUuid) throw new Error(`Components::retrieve(): the 'componentUuid' has not been specified!`);

  // Attempt to set the match condition to the specified UUID (in binary format), and return 'null' if the string-to-binary conversion fails
  try {
    match_condition.componentUuid = MUUID.from(match_condition.componentUuid);
  } catch (e) { return null; }

  // Set up any additional options that have been specified via the 'projection' argument
  let options = {};

  if (projection) options.projection = projection;

  // Query the 'components' records collection for records matching the match condition and additional options
  // Then sort any matching records such that the most recent version is first in the list
  let records = await db.collection('components')
    .find(match_condition, options)
    .sort({ 'validity.version': -1 })
    .toArray();

  // If there is at least one matching record ...
  if (records.length > 0) {
    // Convert the 'componentUuid' of the first matching record from binary to string format, for better readability and consistent display
    records[0].componentUuid = MUUID.from(records[0].componentUuid).toString();

    // Return the first matching record
    return records[0];
  }

  // If there are no matching records (i.e. the whole of the 'if' statement above is skipped), simply return 'null'
  return null;
}


/// Retrieve all versions of a component record
async function versions(componentUuid) {
  // Set up the DB query match condition to be that a record's component UUID must match the specified one, and throw an error if no component UUID has been specified
  let match_condition = { componentUuid };

  if (typeof componentUuid === 'object' && !(componentUuid instanceof Binary)) match_condition = componentUuid;

  if (!match_condition.componentUuid) throw new Error(`Components::versions(): the 'componentUuid' has not been specified!`);

  // Attempt to set the match condition to the specified UUID (in binary format), and return 'null' if the string-to-binary conversion fails
  try {
    match_condition.componentUuid = MUUID.from(match_condition.componentUuid);
  } catch (e) { return null; }

  // Query the 'components' records collection for records matching the match condition
  // Then sort any matching records such that the most recent version is first in the list
  let records = await db.collection('components')
    .find(match_condition)
    .sort({ 'validity.version': -1 })
    .toArray();

  // Convert the 'componentUuid' of each matching record from binary to string format, for better readability and consistent display
  for (let record of records) {
    record.componentUuid = MUUID.from(record.componentUuid).toString();
  }

  // Return the entire list of matching records
  return records;
}


/// Retrieve a list of component records matching a specified condition
async function list(match_condition, options) {
  let aggregation_stages = [];

  // If a matching condition has been specified, set it as the first aggregation stage
  // If the matching condition additionally contains a (string format) component UUID, first convert it to binary format
  if (match_condition) {
    if (match_condition.componentUuid) {
      if (match_condition.componentUuid['$in']) match_condition.componentUuid['$in'] = match_condition.componentUuid['$in'].map(x => MUUID.from(x));
    }

    aggregation_stages.push({ $match: match_condition });
  }

  // Select only the latest version of each record
  // First sort the matching records by validity ... highest version first
  // Then group the records by the component UUID (i.e. each group contains all versions of the same component), and select only the first (highest version number) entry in each group
  // Finally, set which fields in the first record are to be returned for use in subsequent aggregation stages
  aggregation_stages.push({ $sort: { 'validity.version': -1 } });
  aggregation_stages.push({
    $group: {
      _id: { componentUuid: '$componentUuid' },
      componentUuid: { '$first': '$componentUuid' },
      typeFormId: { '$first': '$formId' },
      typeFormName: { '$first': '$formName' },
      name: { '$first': '$data.name' },
      lastEditDate: { '$first': '$validity.startDate' },
      creationDate: { '$last': '$validity.startDate' },
    },
  });

  // Re-sort the records by most last edit date ... most recent first
  aggregation_stages.push({ $sort: { lastEditDate: -1 } });

  // Add aggregation stages for any additionally specified options
  if (options) {
    if (options.skip) aggregation_stages.push({ $skip: options.skip });
    if (options.limit) aggregation_stages.push({ $limit: options.limit });
  }

  // Query the 'components' records collection using the aggregation stages defined above
  let records = await db.collection('components')
    .aggregate(aggregation_stages)
    .toArray();

  // Convert the 'componentUuid' of each matching record from binary to string format, for better readability and consistent display
  for (let record of records) {
    record.componentUuid = MUUID.from(record.componentUuid).toString();
  }

  // Return the entire list of matching records
  return records;
}


/// Retrieve collated information about a single assembled APA that will be displayed in its executive summary
async function collateExecSummaryInfo(componentUUID) {
  // Set up an empty dictionary to store the collated information ... it will be saved as [key, value] pairs for easier access on the executive summary interface page
  let collatedInfo = {};

  // For each (component or action) record that needs to be retrieved and information extracted from, the same series of steps should be performed:
  //   - get all versions of the record that matches the component UUID and specified component or action type form ID
  //   - get the single most recent version of the matching record (sort by validity, group by component UUID or action ID [there should only be one group], and select the first entry in the group)
  //   - extract only the required information from the record and save it into the dictionary under the appropriate key

  // Get information about the temperature sensors
  let aggregation_stages = [];
  let results = [];

  aggregation_stages.push({
    $match: {
      'typeFormId': 'pd_cable_temp_sensor_install',
      'componentUuid': MUUID.from(componentUUID),
    }
  });

  aggregation_stages.push({ $sort: { 'validity.version': -1 } });
  aggregation_stages.push({
    $group: {
      _id: { actionId: '$actionId' },
      data: { '$first': '$data' },
    },
  });

  results = await db.collection('actions')
    .aggregate(aggregation_stages)
    .toArray();

  if (results.length > 0) {
    collatedInfo.tempSensors_config = results[0].data.configuration;
    collatedInfo.tempSensors_serials = [results[0].data.tempSensorSerialNumber, results[0].data.tempSensorSerialNumber1, results[0].data.tempSensorSerialNumber2, results[0].data.tempSensorSerialNumber3];
  } else {
    collatedInfo.tempSensors_config = 'none';
    collatedInfo.tempSensors_serials = ['none', 'none', 'none', 'none'];
  }

  // Get information about any missing or misplaced wire segments
  aggregation_stages = [];
  results = [];

  aggregation_stages.push({
    $match: {
      'typeFormId': 'APANonConformance',
      'componentUuid': MUUID.from(componentUUID),
      $or: [{
        'data.nonConformanceType.missingWireSegment': true
      }, {
        'data.nonConformanceType.misplacedWireSegment': true
      }],
    }
  });

  aggregation_stages.push({ $sort: { 'validity.version': -1 } });
  aggregation_stages.push({
    $group: {
      _id: { actionId: '$actionId' },
      actionId: { '$first': '$actionId' },
      wireData: { '$first': '$data.dataGrid' },
    },
  });

  results = await db.collection('actions')
    .aggregate(aggregation_stages)
    .toArray();

  collatedInfo.wireNonConformances = [];

  if (results.length > 0) {
    for (const result of results) {
      for (const entry of result.wireData) {
        dictionary = {
          layerSide: entry.wireLayer.toUpperCase(),
          boardPad: entry.headBoardAndPad,
          channel: entry.coldElectronicsChannel,
          actionId: result.actionId,
        }

        collatedInfo.wireNonConformances.push(dictionary);
      }
    }
  }

  // Get information about any non-wire related non-conformances on the Assembled APA
  aggregation_stages = [];
  results = [];

  aggregation_stages.push({
    $match: {
      'typeFormId': 'APANonConformance',
      'componentUuid': MUUID.from(componentUUID),
      'data.nonConformanceType.missingWireSegment': false,
      'data.nonConformanceType.misplacedWireSegment': false,
    }
  });

  aggregation_stages.push({ $sort: { 'validity.version': -1 } });
  aggregation_stages.push({
    $group: {
      _id: { actionId: '$actionId' },
      actionId: { '$first': '$actionId' },
      nonConf_type: { '$first': '$data.nonConformanceType' },
      nonConf_description: { '$first': '$data.nonConformanceDescription' },
    },
  });

  results = await db.collection('actions')
    .aggregate(aggregation_stages)
    .toArray();

  dictionary_apaNonConformanceIssues = {
    geometryBoardIssue: 'Geometry Board Issue',
    combIssue: 'Comb Issue',
    machiningIssue: 'Machining Issue',
    conduitIssue: 'Conduit Issue',
    incorrectFasteners: 'Incorrect Fasteners',
  };

  collatedInfo.otherNonConformances = [];

  if (results.length > 0) {
    for (const result of results) {
      let nonConfType = '';

      for (const [key, value] of Object.entries(result.nonConf_type)) {
        if (value) nonConfType = key;
      }

      dictionary = {
        component: 'Assembled APA',
        type: dictionary_apaNonConformanceIssues[nonConfType],
        description: result.nonConf_description,
        actionId: result.actionId,
      }

      collatedInfo.otherNonConformances.push(dictionary);
    }
  }

  // Get information about any non-conformances on the APA frame (first retrieving the full component record of the Assembled APA, which contains the UUID of the frame)
  const assembledAPA = await retrieve(componentUUID);

  aggregation_stages = [];
  results = [];

  aggregation_stages.push({
    $match: {
      'typeFormId': 'APANonConformance',
      'componentUuid': MUUID.from(assembledAPA.data.frameUuid),
    }
  });

  aggregation_stages.push({ $sort: { 'validity.version': -1 } });
  aggregation_stages.push({
    $group: {
      _id: { actionId: '$actionId' },
      actionId: { '$first': '$actionId' },
      nonConf_type: { '$first': '$data.frameNonConformanceType' },
      nonConf_description: { '$first': '$data.nonConformanceDescription' },
    },
  });

  results = await db.collection('actions')
    .aggregate(aggregation_stages)
    .toArray();

  dictionary_frameNonConformanceIssues = {
    machiningIssue: 'Machining Issue',
    bow: 'Bow',
    twist: 'Twist',
    survey: 'Survey',
  };

  collatedInfo.frameNonConformances = [];

  if (results.length > 0) {
    for (const result of results) {
      let nonConfType = '';

      for (const [key, value] of Object.entries(result.nonConf_type)) {
        if (value) nonConfType = key;
      }

      dictionary = {
        component: 'APA Frame',
        type: dictionary_frameNonConformanceIssues[nonConfType],
        description: result.nonConf_description,
        actionId: result.actionId,
      }

      collatedInfo.frameNonConformances.push(dictionary);
    }
  }

  // Return the completed dictionary of collated information
  return collatedInfo;
}


/// Get a list of the current component count per type across all existing component types
async function componentCountsByTypes() {
  let aggregation_stages = [];

  aggregation_stages.push({
    $group: {
      _id: {
        formId: '$formId',
        componentUuid: '$componentUuid',
      },
    },
  });

  aggregation_stages.push({
    $group: {
      _id: '$_id.formId',
      count: { $sum: 1 },
    },
  });

  aggregation_stages.push({
    $project: {
      formId: '$_id',
      count: true,
      _id: false,
    },
  });

  // Query the 'components' records collection using the aggregation stages defined above
  let records = await db.collection('components')
    .aggregate(aggregation_stages)
    .toArray();

  // Reform the query results into an object, with each entry keyed by the type form ID
  let keyedRecords = {};

  for (const record of records) {
    keyedRecords[record.formId] = record;
  }

  // Retrieve an object containing all component type forms, with each entry keyed by the type form ID
  // Then, for each type form, copy the component count from the entry in the results object (if it exists) into the corresponding entry in the type forms object
  let typeFormsList = await Forms.list('componentForms');

  for (const formId of Object.keys(typeFormsList)) {
    if (keyedRecords.hasOwnProperty(formId)) typeFormsList[formId].count = keyedRecords[formId].count;
  }

  // Return the type forms object
  return typeFormsList;
}


/// Auto-complete a component UUID string as it is being typed
/// This function actually returns a list of component records with matching component UUIDs to that being typed
async function autoCompleteUuid(inputString, limit = 10) {
  // Remove any underscores and dashes from the input string
  let q = inputString.replace(/[_-]/g, '');

  // Calculate the minimum and maximum possible binary values of the input string
  // The component UUID is 32 alphanumeric characters long (excluding dashes), so the minimum value is given by the input string padded out to this length with '0' characters, and the maximum by padding using 'F' characters
  const bitlow = Binary(Buffer.from(q.padEnd(32, '0'), 'hex'), Binary.SUBTYPE_UUID);
  const bithigh = Binary(Buffer.from(q.padEnd(32, 'F'), 'hex'), Binary.SUBTYPE_UUID);

  let aggregation_stages = [];

  /// Set up the DB query match condition to be that a record's component UUID must have a binary value between the minimum and maximum values calculated above
  let match_condition = {
    componentUuid: {
      $gte: bitlow,
      $lte: bithigh,
    },
  };

  aggregation_stages.push({ $match: match_condition });

  // Select only the latest version of each record
  // First sort the matching records by validity ... highest version first
  // Then group the records by the component UUID (i.e. each group contains all versions of the same component), and select only the first (highest version number) entry in each group
  // Finally, set which fields in the first record are to be returned for use in subsequent aggregation stages
  aggregation_stages.push({ $sort: { 'validity.version': -1 } });
  aggregation_stages.push({
    $group: {
      _id: { componentUuid: '$componentUuid' },
      componentUuid: { '$first': '$componentUuid' },
      typeFormName: { '$first': '$formName' },
      name: { '$first': '$data.name' },
      lastEditDate: { '$first': '$validity.startDate' },
    },
  });

  // Re-sort the records by last edit date ... most recent first
  aggregation_stages.push({ $sort: { lastEditDate: -1 } });

  // Limit the number of returned matching records, just so the interface doesn't get too busy
  aggregation_stages.push({ $limit: limit });

  // Query the 'components' records collection using the aggregation stages defined above
  let records = await db.collection('components')
    .aggregate(aggregation_stages)
    .toArray();

  // Convert the 'componentUuid' of each matching record from binary to string format, for better readability and consistent display
  for (let record of records) {
    record.componentUuid = MUUID.from(record.componentUuid).toString();
  }

  // Return the entire list of matching records
  return records;
}


module.exports = {
  newUuid,
  save,
  updateLocation,
  retrieve,
  versions,
  list,
  collateExecSummaryInfo,
  componentCountsByTypes,
  autoCompleteUuid,
}
