const ObjectID = require('mongodb').ObjectID;

const commonSchema = require('lib/commonSchema.js');
const { db } = require('./db');
const dbLock = require('lib/dbLock.js');
const Forms = require('lib/Forms.js');
const permissions = require('lib/permissions.js');


/// Save a new or edited workflow record
async function save(input, req) {
  // Check that the user has permission to create and edit workflows
  if (!permissions.hasPermission(req, 'workflows:edit')) throw new Error(`Workflows::save() - you do not have permission [workflows:edit] to create and/or edit workflows!`);

  // Check that the minimum required information has been provided for a record to be saved
  // For workflow records, these are:
  //   - the workflow type form ID
  //   - user-provided data (may be empty of content, but must still exist)
  //   - a workflow path (the path steps will be checked later in this function)
  if (!(input instanceof Object)) throw new Error(`Workflows::save() - the 'input' object has not been specified!`);
  if (!input.hasOwnProperty('typeFormId')) throw new Error(`Workflows::save() - the 'input.typeFormId' has not been specified!`);
  if (!input.hasOwnProperty('data')) throw new Error(`Workflows::save() - the 'input.data' has not been specified!`);
  if (!input.hasOwnProperty('path')) throw new Error(`Workflows::save() - the 'input.path' has not been specified!`);

  // Check that there is an existing type form corresponding to the the provided type form ID
  const typeFormsList = await Forms.list('workflowForms');
  const typeForm = typeFormsList[input.typeFormId];

  if (!typeForm) throw new Error(`Workflows:save() - the specified 'input.typeFormId' (${input.typeFormId}) does not match a known workflow type form!`);

  // Check that each step of the workflow path has the minimum required information:
  //   - the type of the step (named as 'type' for each step, and taking either 'component' or 'action' as value)
  //   - the type form name of the step (named as 'formName' for each step)
  for (const step of input.path) {
    if (!step.type) throw new Error(`Workflows::save() - the 'step.type' has not been specified for one or more steps!`);
    if ((!(step.type === 'component')) && (!(step.type === 'action'))) throw new Error(`Workflows::save() - the 'step.type' is not valid for one or more steps (must be either 'component' or 'action'!`);
    if (!step.formName) throw new Error(`Workflows::save() - the 'step.formName' has not been specified for one or more steps!`);
  }

  // Check that the first step of the workflow path is a 'component' type one (since component creation must always be performed first)
  if (!(input.path[0].type === 'component')) throw new Error(`Workflows::save() - the 'step.type' of the first step is not 'component'!`);

  // Set up a new (initially empty) record object
  let newRecord = {};

  // Add information to the new record, either directly or from the 'input' object
  // If no type form name has been specified in the 'input' object, use the value from the type form instead
  newRecord.recordType = 'workflow';
  newRecord.workflowId = new ObjectID(input.workflowId);
  newRecord.typeFormId = input.typeFormId;
  newRecord.typeFormName = input.typeFormName || typeForm.formName;
  newRecord.data = input.data;
  newRecord.path = input.path;

  // Generate and add an 'insertion' field to the new record
  newRecord.insertion = commonSchema.insertion(req);

  let _lock = await dbLock(`saveWorkflow_${newRecord.workflowId}`, 1000);

  // Attempt to retrieve an existing record with the same workflow ID as the specified one (relevant if we are editing an existing record)
  let oldRecord = null;

  if (input.workflowId) oldRecord = await retrieve(input.workflowId);

  // Generate and add a 'validity' field to the new record
  // This may be generated from scratch (for a new record), or via incrementing that of the existing record (if editing)
  newRecord.validity = commonSchema.validity(null, oldRecord);
  newRecord.validity.ancestor_id = input._id;

  // Insert the new record into the 'workflows' records collection
  const result = await db.collection('workflows')
    .insertOne(newRecord);

  _lock.release();

  // Throw an error if the insertion fails
  if (result.insertedCount !== 1) throw new Error(`Workflows::save() - failed to insert a new workflow record into the database!`);

  // Return the record as proof that it has been saved successfully
  return result.ops[0];
}


/// Retrieve a single version of a workflow record (either the most recent, or a specified one)
async function retrieve(workflowId, projection) {
  // Construct the 'match_condition' to be used as the database query
  // For this function, it is that a record's workflow ID must match the specified one
  let match_condition = { workflowId };

  if (typeof workflowId === 'object' && !(workflowId instanceof ObjectID)) match_condition = workflowId;

  // Throw an error if no workflow ID has been specified
  if (!match_condition.workflowId) throw new Error(`Workflows::retrieve(): the 'workflowId' has not been specified!`);

  match_condition.workflowId = new ObjectID(match_condition.workflowId);

  // Set up any additional options that have been specified via the 'projection'
  // For this function, the only additional option will be a specified record version number
  let options = {};

  if (projection) options.projection = projection;

  // Query the 'workflows' records collection for records matching the condition and additional options
  // Then sort any matching records such that the most recent version is first in the list
  let records = await db.collection('workflows')
    .find(match_condition, options)
    .sort({ 'validity.version': -1 })
    .toArray();

  // If there is at least one matching record ...
  if (records.length > 0) {
    // Return the first matching record
    return records[0];
  }

  return null;
}


/// Retrieve all versions of a workflow record
async function versions(workflowId) {
  // Construct the 'match_condition' to be used as the database query
  // For this function, it is that a record's workflow ID must match the specified one
  let match_condition = { workflowId };

  if (typeof workflowId === 'object' && !(workflowId instanceof ObjectID)) match_condition = workflowId;

  // Throw an error if no workflow ID has been specified
  if (!match_condition.workflowId) throw new Error(`Workflows::versions(): the 'workflowId' has not been specified!`);

  match_condition.workflowId = new ObjectID(match_condition.workflowId);

  // Query the 'workflows' records collection for records matching the condition
  // Then sort any matching records such that the most recent version is first in the list
  let records = await db.collection('workflows')
    .find(match_condition)
    .sort({ 'validity.version': -1 })
    .toArray();

  // Return the entire list of matching records
  return records;
}


/// Retrieve a list of workflow records matching a specified condition
async function list(match_condition, options) {
  // Set up the 'aggregation stages' of the database query - these are the query steps in sequence
  let aggregation_stages = [];

  // If a matching condition has been specified, this is the first aggregation stage
  if (match_condition) {
    aggregation_stages.push({ $match: match_condition });
  }

  // Next we want to remove all but the most recent version of each matching record
  // First sort the matching records by validity ... highest version first
  aggregation_stages.push({ $sort: { 'validity.version': -1 } });

  // Then group the records by whatever fields will be subsequently used
  // For example, if the 'workflowId' of each returned record is to be used later on, it must be one of the groups defined here
  // Note that this changes some field access via dot notation - i.e. in the returned records, 'workflow.data.name' becomes 'workflow.name'
  aggregation_stages.push({
    $group: {
      _id: { workflowId: '$workflowId' },
      workflowId: { '$first': '$workflowId' },
      typeFormId: { '$first': '$typeFormId' },
      typeFormName: { '$first': '$typeFormName' },
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

  // Query the 'workflows' records collection using the aggregation stages
  let records = await db.collection('workflows')
    .aggregate(aggregation_stages)
    .toArray();

  // Return the entire list of workflow records
  return records;
}


/// Search for workflow records
/// The search can be performed via either a text search or specifying a record to match to
async function search(textSearch, matchRecord, skip = 0, limit = 20) {
  // Construct the 'match_condition' to be used as the database query
  // If no record to match to is specified (i.e. we are doing a text search), the condition will remain empty for now
  // Otherwise, it is that a record must match the specified one
  let match_condition = matchRecord || {};

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
      _id: { workflowId: '$workflowId' },
      workflowId: { '$first': '$workflowId' },
      typeFormId: { '$first': '$typeFormId' },
      typeFormName: { '$first': '$typeFormName' },
      name: { '$first': '$data.name' },
      lastEditDate: { '$first': '$validity.startDate' },
      creationDate: { '$last': '$validity.startDate' },
    },
  });

  if (textSearch) {
    aggregation_stages.push({
      $group: { score: { "$max": { $meta: "textScore" } } },
      $sort: { score: -1 },
    });
  }

  aggregation_stages.push({ $sort: { lastEditDate: -1 } });

  // Query the 'workflows' records collection for records matching the condition and additionally defined aggregation stages
  let records = await db.collection('workflows')
    .aggregate(aggregation_stages)
    .toArray();

  // Add a 'route' field to each record, which is the URL of that record's information page
  for (let record of records) {
    record.route = `/workflow/${record.workflowId.toString()}`;
  }

  // Return the entire list of workflow records
  return records;
}


/// Auto-complete a workflow ID string as it is being typed
/// This actually returns the records of all workflows with a matching workflow ID to that being typed
async function autoCompleteId(inputString, typeFormId, limit = 10) {
  // The workflow ID is 24 alphanumeric characters long, so pad the input string out to this length
  // Then set up objects representing the minimum and maximum binary values that are possible for the current input string
  let q = inputString.replace(/[_-]/g, '');

  const bitlow = ObjectID(q.padEnd(24, '0'));
  const bithigh = ObjectID(q.padEnd(24, 'F'));

  // Construct a 'match_condition' to be used as the database query
  // For this function, it is that the workflow ID's binary value is between the minimum and maximum binary values defined above
  let match_condition = {
    workflowId: {
      $gte: bitlow,
      $lte: bithigh,
    },
  };

  // If a workflow type form ID has also been specified, add it to the condition
  // This means that as well as the binary value match above, the corresponding workflow record must also contain the specified type form ID
  if (typeFormId) match_condition.typeFormId = typeFormId;

  // Query the 'workflows' records collection for records matching the condition
  let records = await db.collection('workflows')
    .find(match_condition)
    .project({
      'workflowId': 1,
      'typeFormId': 1,
      'data.name': 1,
    })
    .limit(limit)
    .toArray();

  // Return the entire list of workflow records
  return records;
}


module.exports = {
  save,
  retrieve,
  versions,
  list,
  search,
  autoCompleteId,
}
