'use strict';

const commonSchema = require('lib/commonSchema.js');
const { db } = require('./db');
const dbLock = require('lib/dbLock.js');
const Forms = require('lib/Forms.js');
const MUUID = require('uuid-mongodb');
const ObjectID = require('mongodb').ObjectID;
const permissions = require('lib/permissions.js');

module.exports = {
  save,
  retrieve,
  versions,
  list,
  search,
  autoCompleteId
}


/// Save a new or edited action record
async function save(input, req) {
  // Check that the user has permission to perform (and re-perform) actions
  if (!permissions.hasPermission(req, 'actions:perform')) {
    throw new Error("Actions::save() - you do not have permission [actions:perform] to create and/or edit actions!");
  }

  // Check that the minimum required information has been provided for a record to be saved
  // For action records, these are:
  //   - the action type form ID
  //   - the UUID of the component on which the action has been performed
  //   - user-provided data (may be empty of content, but must still exist)
  if (!input) {
    throw new Error("Actions::save() - the 'input' object has not been specified!");
  }

  if (!input.typeFormId) {
    throw new Error("Actions::save() - the 'input.typeFormId' has not been specified!");
  }

  if (!input.componentUuid) {
    throw new Error("Actions::save() - the 'input.componentUuid' has not been specified!");
  }

  if (!input.data) {
    throw new Error("Actions::save() - the 'input.data' has not been specified!");
  }

  // Check that there is an existing type form corresponding to the the provided type form ID
  var typeFormsList = await Forms.list('actionForms');
  var typeForm = typeFormsList[input.typeFormId];

  if (!typeForm) {
    throw new Error("Actions:save() - the specified 'input.typeFormId' (" + input.typeFormId + ") does not match a known action type form!");
  }

  // Set up a new record using the provided 'input' object as a basis
  var newRecord = { ...input };

  // Add the type form name to the new record
  // If no type form name has been specified in the 'input' object, use the one directly from the type form itself
  if (!input.typeFormName) {
    newRecord.typeFormName = typeForm.formName;
  }

  // Make sure that the new record's 'componentUuid' field is in the correct format (it may not be so in the 'input' object)
  newRecord.componentUuid = MUUID.from(input.componentUuid);

  // Add additional information to the new record
  newRecord.actionId = (input.actionId) ? new ObjectID(input.actionId) : new ObjectID();
  newRecord.recordType = 'action';
  newRecord.state = 'submitted';

  // Remove the existing 'insertion' field from the new record if it already exists, and generate a new one
  // When editing an existing record, this field will already exist due to the way that the 'input' object inherits information from the previous record version
  if (newRecord.insertion) {
    delete newRecord.insertion;
  }

  newRecord.insertion = commonSchema.insertion(req);

  var _lock = await dbLock("saveAction" + newRecord.actionId, 1000);

  // Attempt to retrieve an existing record with the same action ID as the specified one
  // This is relevant if we are editing an existing record
  // If no such record exists, i.e. we are saving a completely new action, this will return 'null'
  var oldRecord = null;

  if (input.actionId) {
    oldRecord = await retrieve(input.actionId);
  }

  // Remove the existing 'validity' field from the new record if it already exists, and generate a new one
  // When editing an existing record, this field will already exist due to the way that the 'input' object inherits information from the previous record version
  // The new 'validity' field may be generated from scratch (for a new record), or via incrementing that of the existing record (if editing)
  if (newRecord.validity) {
    delete newRecord.validity;
  }

  newRecord.validity = commonSchema.validity(newRecord.validity, oldRecord);
  newRecord.validity.ancestor_id = newRecord._id;

  // Remove the existing '_id' field from the new record, so that a new value can be added upon saving
  // This field changes (very slightly) each time the record is edited, but the 'actionId' remains constant across all versions
  delete newRecord._id;

  // Insert the new record into the 'actions' records collection
  var result = await db.collection('actions')
    .insertOne(newRecord);

  _lock.release();

  // Throw an error if the insertion fails
  if (result.insertedCount != 1) {
    throw new Error("Actions::save() - failed to insert a new action record into the database!");
  }

  // Return the record as proof that it has been saved successfully
  return result.ops[0];
}


/// Retrieve a single version of an action record (either the most recent, or a specified one)
async function retrieve(actionId, projection) {
  // Construct the 'match_condition' to be used as the database query
  // For this function, it is that a record's action ID must match the specified one
  var match_condition = { actionId: actionId };

  if (typeof actionId === 'object' && !(actionId instanceof ObjectID)) {
    match_condition = actionId;
  }

  // Throw an error if no action ID has been specified
  if (!match_condition.actionId) {
    throw new Error("Actions::retrieve(): the 'actionId' has not been specified!");
  }

  match_condition.actionId = new ObjectID(match_condition.actionId);

  // Set up any additional options that have been specified via the 'projection'
  // For this function, the only additional option will be a specified record version number
  var options = {};

  if (projection) {
    options.projection = projection;
  }

  // Query the 'actions' records collection for records matching the condition and additional options
  // Then sort any matching records such that the most recent version is first in the list
  var records = await db.collection('actions')
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
  else {
    return null;
  }
}


/// Retrieve all versions of an action record
async function versions(actionId) {
  // Construct the 'match_condition' to be used as the database query
  // For this function, it is that a record's action ID must match the specified one
  var match_condition = { actionId: new ObjectID(actionId) };

  // Throw an error if no action ID has been specified
  if (!match_condition.actionId) {
    throw new Error("Actions::versions(): the 'actionId' has not been specified!");
  }

  // Query the 'actions' records collection for records matching the condition
  // Then sort any matching records such that the most recent version is first in the list
  var records = await db.collection('actions')
    .find(match_condition)
    .sort({ 'validity.version': -1 })
    .toArray();

  // Convert the 'componentUuid' of each matching record from binary to string format, for better readability and consistent display
  for (var record of records) {
    record.componentUuid = MUUID.from(record.componentUuid).toString();
  }

  // Return the entire list of matching records
  return records;
}


/// Retrieve a list of action records matching a specified condition
async function list(match_condition, options) {
  // Set up the 'aggregation stages' of the database query - these are the query steps in sequence
  var aggregation_stages = [];

  // If a matching condition has been specified, this is the first aggregation stage
  // If a condition has not been specified (i.e. it is 'null'), the match is made to all records
  // If the matching condition contains a component UUID, make sure that it is in binary format first
  if (match_condition) {
    if (match_condition.componentUuid) {
      match_condition.componentUuid = MUUID.from(match_condition.componentUuid);
    }

    aggregation_stages.push({ $match: match_condition });
  }

  // Next we want to remove all but the most recent version of each matching record
  // First sort the matching records by validity ... highest version first
  aggregation_stages.push({ $sort: { 'validity.insertDate': -1 } });

  // Then group the records by whatever fields will be subsequently used
  // For example, if the 'actionId' of each returned record is to be used later on, it must be one of the groups defined here
  // '$first' indicates that we take only the first record when they are grouped according to that field (the order remains highest version first)
  // '$last' indicates that we take only the last record when they are grouped according to that field
  // Note that this changes some field access via dot notation - i.e. in the returned records, 'action.data.name' becomes 'action.name'
  aggregation_stages.push({
    $group: {
      _id: { actionId: '$actionId' },
      actionId: { '$first': '$actionId' },
      componentUuid: { '$first': '$componentUuid' },
      typeFormId: { '$first': '$typeFormId' },
      typeFormName: { '$first': '$typeFormName' },
      name: { '$first': '$data.name' },
      insertDate: { '$last': '$insertion.insertDate' }
    }
  });

  // Finally re-sort the remaining matching records by most recent insertion date first (now called 'insertDate' as per the group name)
  aggregation_stages.push({ $sort: { insertDate: -1 } });

  // Add aggregation stages for any additionally specified options
  if (options) {
    if (options.skip) {
      aggregation_stages.push({ $skip: options.skip });
    }

    if (options.limit) {
      aggregation_stages.push({ $limit: options.limit });
    }
  }

  // Query the 'actions' records collection using the aggregation stages
  var records = await db.collection('actions')
    .aggregate(aggregation_stages)
    .toArray();

  // Convert the 'componentUuid' of each matching record from binary to string format, for better readability
  for (var record of records) {
    record.componentUuid = MUUID.from(record.componentUuid).toString();
  }

  // Return the entire list of action records
  return records;
}


/// Search for action records
/// The search can be performed via either a text search or specifying a record to match to
async function search(textSearch, matchRecord, skip, limit) {
  // Set the number of records to skip at the start of the search result, and the maximum number of matching records to return
  skip = skip || 0;
  limit = limit || 20;

  // Construct the 'match_condition' to be used as the database query
  // If no record to match to is specified (i.e. we are doing a text search), the condition will remain empty for now
  // Otherwise, it is that a record must match the specified one
  var match_condition = { ...matchRecord } || {};

  // If the condition contains a component UUID, set it to binary format
  if (match_condition.componentUuid) {
    match_condition.componentUuid = MUUID.from(match_condition.componentUuid)
  }

  // If we are doing a text search, set the 'text' field of the condition
  if (textSearch) {
    match_condition['$text'] = { $search: textSearch };
  }

  // Set up the 'aggregation stages' of the query - these are the query steps in sequence
  var aggregation_stages = [];

  aggregation_stages.push({ $match: match_condition });

  if (textSearch) {
    aggregation_stages.push({ $sort: { score: { $meta: 'textScore' } } });
  }

  aggregation_stages.push({ $sort: { 'insertion.insertDate': -1 } });
  aggregation_stages.push({ $skip: skip });
  aggregation_stages.push({ $limit: limit });

  // Query the 'actions' records collection for records matching the condition and additionally defined aggregation stages
  var records = await db.collection('actions')
    .aggregate(aggregation_stages)
    .toArray();

  // Convert the 'componentUuid' of each matching record from binary to string format, for better readability
  // Additionally, add a 'route' field to each record, which is the URL of that record's information page
  // Make these changes on copies of the retrieved records, so that the records themselves are not changed
  var searchResults = [];

  for (var record of records) {
    var result = { ...record };
    result.componentUuid = MUUID.from(record.componentUuid).toString();
    result.route = '/action/' + result.actionId.toString();

    searchResults.push(result);
  }

  // Return the finalised search results
  return searchResults;
}


/// Auto-complete an action ID string as it is being typed
/// This actually returns the records of all actions with a matching action ID to that being typed
async function autoCompleteId(inputString, typeFormId, limit) {
  // Set the maximum number of matching action IDs to display
  limit = limit || 10;

  // The action ID is 24 alphanumeric characters long, so pad the input string out to this length
  // Then set up objects representing the minimum and maximum binary values that are possible for the current input string
  var q = inputString.replace(/[_-]/g, '');

  var bitlow = ObjectID(q.padEnd(24, '0'));
  var bithigh = ObjectID(q.padEnd(24, 'F'));

  // Construct a 'match_condition' to be used as the database query
  // For this function, it is that the action ID's binary value is between the minimum and maximum binary values defined above
  var match_condition = {
    actionId: {
      $gte: bitlow,
      $lte: bithigh
    },
    typeFormId: null
  };

  // If an action type form ID has also been specified, add it to the condition
  // This means that as well as the binary value match above, the corresponding action record must also contain the specified type form ID
  if (typeFormId) {
    match_condition.typeFormId = typeFormId;
  }

  // Set up the 'aggregation stages' of the query - these are the query steps in sequence
  var aggregation_stages = [];

  aggregation_stages.push({ $match: match_condition });
  aggregation_stages.push({ $limit: limit });

  // Query the 'actions' records collection for records matching the condition and additionally defined aggregation stages
  var records = await db.collection('actions')
    .aggregate(aggregation_stages)
    .toArray();

  // Convert the 'componentUuid' of each matching record from binary to string format, for better readability
  for (var record of records) {
    record.componentUuid = MUUID.from(record.componentUuid).toString();
  }

  // Return the entire list of action records
  return records;
}
