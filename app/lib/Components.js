const Binary = require('mongodb').Binary;
const MUUID = require('uuid-mongodb');
const shortuuid = require('short-uuid')();

const Cache = require('lib/Cache.js');
const commonSchema = require('lib/commonSchema.js');
const { db } = require('./db');
const dbLock = require('lib/dbLock.js');
const Forms = require('lib/Forms.js');
const permissions = require('lib/permissions.js');


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

  // Check that the minimum required information has been provided for a record to be saved
  // For component records, these are:
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

  // Set up a new (initially empty) record object
  let newRecord = {};

  // Add information to the new record, either directly or from the 'input' object
  // If no type form name has been specified in the 'input' object, use the value from the type form instead
  newRecord.recordType = 'component';
  newRecord.componentUuid = MUUID.from(input.componentUuid);
  newRecord.shortUuid = shortuuid.fromUUID(input.componentUuid);
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

  // Generate and add a 'validity' field to the new record
  // This may be generated from scratch (for a new record), or via incrementing that of the existing record (if editing)
  newRecord.validity = commonSchema.validity(null, oldRecord);
  newRecord.validity.ancestor_id = input._id;

  // Insert the new record into the 'components' records collection
  const result = await db.collection('components')
    .insertOne(newRecord);

  _lock.release();

  // Throw an error if the insertion fails
  if (result.insertedCount !== 1) throw new Error(`Components::save() - failed to insert a new component record into the database!`);

  // Make a copy of the inserted record, and convert the 'componentUuid' from binary to string format, for better readability and consistent display
  let record = { ...result.ops[0] };
  record.componentUuid = MUUID.from(newRecord.componentUuid).toString();

  Cache.invalidate('componentCountsByType');

  // Return the record as proof that it has been saved successfully
  return record;
}


/// Retrieve a single version of a component record (either the most recent, or a specified one)
async function retrieve(componentUuid, projection) {
  // Construct the 'match_condition' to be used as the database query
  // For this function, it is that a record's component UUID must match the specified one
  let match_condition = { componentUuid };

  if (typeof componentUuid === 'object' && !(componentUuid instanceof Binary)) match_condition = componentUuid;

  // Throw an error if no component UUID has been specified
  if (!match_condition.componentUuid) throw new Error(`Components::retrieve(): the 'componentUuid' has not been specified!`);

  match_condition.componentUuid = MUUID.from(match_condition.componentUuid);

  // Set up any additional options that have been specified via the 'projection'
  // For this function, the only additional option will be a specified record version number
  let options = {};

  if (projection) options.projection = projection;

  // Query the 'components' records collection for records matching the condition and additional options
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

  return null;
}


/// Retrieve all versions of a component record
async function versions(componentUuid) {
  // Construct the 'match_condition' to be used as the database query
  // For this function, it is that a record's component UUID must match the specified one
  let match_condition = { componentUuid };

  if (typeof componentUuid === 'object' && !(componentUuid instanceof Binary)) match_condition = componentUuid;

  // Throw an error if no component UUID has been specified
  if (!match_condition.componentUuid) throw new Error(`Components::versions(): the 'componentUuid' has not been specified!`);

  match_condition.componentUuid = MUUID.from(match_condition.componentUuid);

  // Query the 'components' records collection for records matching the condition
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
  // Set up the 'aggregation stages' of the database query - these are the query steps in sequence
  let aggregation_stages = [];

  // If a matching condition has been specified, this is the first aggregation stage
  // If the matching condition contains a component UUID, make sure that it is in binary format first
  if (match_condition) {
    if (match_condition.componentUuid) {
      if (match_condition.componentUuid['$in']) match_condition.componentUuid['$in'] = match_condition.componentUuid['$in'].map(x => MUUID.from(x));
    }

    aggregation_stages.push({ $match: match_condition });
  }

  // Next we want to remove all but the most recent version of each matching record
  // First sort the matching records by validity ... highest version first
  aggregation_stages.push({ $sort: { 'validity.version': -1 } });

  // Then group the records by whatever fields will be subsequently used
  // For example, if the 'componentUuid' of each returned record is to be used later on, it must be one of the groups defined here
  // Note that this changes some field access via dot notation - i.e. in the returned records, 'component.data.name' becomes 'component.name'
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

  // Finally re-sort the remaining matching records by most recent editing date first (now called 'lastEditDate' as per the group name)
  aggregation_stages.push({ $sort: { lastEditDate: -1 } });

  // Add aggregation stages for any additionally specified options
  if (options) {
    if (options.skip) aggregation_stages.push({ $skip: options.skip });
    if (options.limit) aggregation_stages.push({ $limit: options.limit });
  }

  // Query the 'components' records collection using the aggregation stages
  let records = await db.collection('components')
    .aggregate(aggregation_stages)
    .toArray();

  // Convert the 'componentUuid' of each matching record from binary to string format, for better readability
  for (let record of records) {
    record.componentUuid = MUUID.from(record.componentUuid).toString();
  }

  // Return the entire list of component records
  return records;
}


/// (Re)generate the cache of component counts by type
Cache.add('componentCountsByType', async function () {
  // Set up the 'aggregation stages' of the database query - these are the query steps in sequence
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

  // Query the 'components' records collection using the aggregation stages
  let results = await db.collection('components')
    .aggregate(aggregation_stages)
    .toArray();

  let returnedValues = {};

  for (var result of results) {
    returnedValues[result.formId] = result;
  }

  // Return the final results
  return returnedValues;
});


/// Get the currently cached component counts by type
async function componentCountsByTypes() {
  const currentCache = Cache.current('componentCountsByType');
  return currentCache;
}


/// Search for component records
/// The search can be performed via either a text search or specifying a record to match to
async function search(textSearch, matchRecord, skip = 0, limit = 20) {
  // Construct the 'match_condition' to be used as the database query
  // If no record to match to is specified (i.e. we are doing a text search), the condition will remain empty for now
  // Otherwise, it is that a record must match the specified one
  let match_condition = matchRecord || {};

  // If the condition contains a component UUID, set it to binary format
  if (match_condition.componentUuid) match_condition.componentUuid = MUUID.from(match_condition.componentUuid);

  // If we are doing a text search, set the 'text' field of the condition
  if (textSearch) match_condition['$text'] = { $search: textSearch };

  // Set up the 'aggregation stages' of the query - these are the query steps in sequence
  let aggregation_stages = [];

  aggregation_stages.push({ $match: match_condition });

  if (textSearch) aggregation_stages.push({ $sort: { score: { $meta: 'textScore' } } });

  aggregation_stages.push({ $sort: { 'validity.startDate': -1 } });
  aggregation_stages.push({ $skip: skip });
  aggregation_stages.push({ $limit: limit });

  aggregation_stages.push({
    $group: {
      _id: { componentUuid: '$componentUuid' },
      componentUuid: { '$first': '$componentUuid' },
      typeFormId: { '$first': '$formId' },
      typeFormName: { '$first': '$formName' },
      name: { '$first': '$data.name' },
      creationDate: { '$last': '$validity.startDate' },
      lastEditDate: { '$last': '$insertion.insertDate' },
    },
  });

  if (textSearch) {
    aggregation_stages.push({
      $group: { score: { '$max': { $meta: 'textScore' } } },
      $sort: { score: -1 },
    });
  }

  aggregation_stages.push({ $sort: { lastEditDate: -1 } });

  // Query the 'components' records collection for records matching the condition and additionally defined aggregation stages
  let records = await db.collection('components')
    .aggregate(aggregation_stages)
    .toArray();

  // Convert the 'componentUuid' of each matching record from binary to string format, for better readability
  // Additionally, add a 'route' field to each record, which is the URL of that record's information page
  for (let record of records) {
    record.componentUuid = MUUID.from(record.componentUuid).toString();
    record.route = `/component/${record.componentUuid}`;
  }

  // Return the entire list of component records
  return records;
}


/// Auto-complete a component UUID string as it is being typed
/// This actually returns the records of all components with a matching component UUID to that being typed
async function autoCompleteUuid(inputString, typeFormId, limit = 10) {
  // The component UUID is 32 alphanumeric characters long, so pad the input string out to this length
  // Then set up objects representing the minimum and maximum binary values that are possible for the current input string
  let q = inputString.replace(/[_-]/g, '');

  const bitlow = Binary(Buffer.from(q.padEnd(32, '0'), 'hex'), Binary.SUBTYPE_UUID);
  const bithigh = Binary(Buffer.from(q.padEnd(32, 'F'), 'hex'), Binary.SUBTYPE_UUID);

  // Construct a 'match_condition' to be used as the database query
  // For this function, it is that the component UUID's binary value is between the minimum and maximum binary values defined above
  let match_condition = {
    componentUuid: {
      $gte: bitlow,
      $lte: bithigh,
    },
  };

  // If an component type form ID has also been specified, add it to the condition
  // This means that as well as the binary value match above, the corresponding component record must also contain the specified type form ID
  if (typeFormId) match_condition.formId = typeFormId;

  // Query the 'component' records collection for records matching the condition
  let records = await db.collection('components')
    .find(match_condition)
    .project({
      'componentUuid': 1,
      'formId': 1,
      'data.name': 1,
    })
    .limit(limit)
    .toArray();

  // Convert the 'componentUuid' of each matching record from binary to string format, for better readability
  for (let record of records) {
    record.componentUuid = MUUID.from(record.componentUuid).toString();
  }

  // Return the entire list of component records
  return records;
}


module.exports = {
  newUuid,
  save,
  retrieve,
  versions,
  list,
  componentCountsByTypes,
  search,
  autoCompleteUuid,
}
