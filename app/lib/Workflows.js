const ObjectID = require('mongodb').ObjectId;

const commonSchema = require('./commonSchema');
const Components = require('./Components');
const { db } = require('./db');
const dbLock = require('./dbLock');
const Forms = require('./Forms');
const permissions = require('./permissions');


/// Save a new or edited workflow record
async function save(input, req) {
  // Check that the user has permission to create and edit workflows
  if (!permissions.hasPermission(req, 'workflows:edit')) throw new Error(`Workflows::save() - you do not have permission [workflows:edit] to create and/or edit workflows!`);

  // Check that the minimum required workflow information has been provided:
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
  //   - the type of the step (named as 'type', and taking either 'component' or 'action' as value)
  //   - the type form name of the step (named as 'formName')
  for (const step of input.path) {
    if (!step.type) throw new Error(`Workflows::save() - the 'step.type' has not been specified for one or more steps!`);
    if ((!(step.type === 'component')) && (!(step.type === 'action'))) throw new Error(`Workflows::save() - the 'step.type' is not valid for one or more steps (must be either 'component' or 'action'!`);
    if (!step.formName) throw new Error(`Workflows::save() - the 'step.formName' has not been specified for one or more steps!`);
  }

  // Check that the first step of the workflow path is 'component' type (since component creation must always be performed first)
  if (!(input.path[0].type === 'component')) throw new Error(`Workflows::save() - the 'step.type' of the first step is not 'component'!`);

  // Set up a new record object, and immediately add information, either directly or inherited from the 'input' object
  // If no type form name has been specified in the 'input' object, use the value from the type form instead
  let newRecord = {};

  newRecord.recordType = 'workflow';
  newRecord.workflowId = new ObjectID(input.workflowId);
  newRecord.typeFormId = input.typeFormId;
  newRecord.typeFormName = typeForm.formName;
  newRecord.data = input.data;
  newRecord.path = input.path;

  // Generate and add an 'insertion' field to the new record
  newRecord.insertion = commonSchema.insertion(req);

  // Attempt to retrieve an existing record with the same workflow ID as the specified one (relevant if we are editing an existing record)
  let oldRecord = null;

  if (input.workflowId) oldRecord = await retrieve(input.workflowId);

  // Generate and add a 'validity' field to the new record, either from scratch (for a new record), or via incrementing that of the existing record (if editing)
  newRecord.validity = commonSchema.validity(oldRecord);
  newRecord.validity.ancestor_id = input._id;

  // Insert the new record into the 'workflows' records collection, and throw and error if the insertion fails
  let _lock = await dbLock(`saveWorkflow_${newRecord.workflowId}`, 1000);

  const result = await db.collection('workflows')
    .insertOne(newRecord);

  _lock.release();

  if (!result.acknowledged) throw new Error(`Workflows::save() - failed to insert a new workflow record into the database!`);

  // If the insertion is successful, return the record's workflow ID as confirmation
  return newRecord.workflowId;
}


/// Update the result of a single step in a workflow path
async function updatePathStep(workflowId, stepIndex, stepResult) {
  // Use the MongoDB '$set' operator to directly edit the values of the relevant fields in the workflow record, and throw an error if the edit fails
  // Preset a dictionary of the variables to be updated using the operator
  // We have to do this separately because the step index is a variable, but the '$set' operator cannot use inline constructed strings as arguments
  let update = { '$set': {} };

  update['$set']['path.' + stepIndex + '.result'] = stepResult;

  const result = db.collection('workflows')
    .findOneAndUpdate(
      { 'workflowId': ObjectID(workflowId) },
      update,
      {
        sort: { 'validity.version': -1 },
        returnNewDocument: true,
      },
    );

  if (result.ok === 0) throw new Error(`Workflows::updatePathStep() - failed to update the workflow record ... ${err}`);

  // If the edit is successful, return the status of the 'result.ok' property (which should be 1)
  return result.ok;
}


/// Retrieve a single version of a workflow record (either the most recent, or a specified one)
async function retrieve(workflowId, projection) {
  /// Set up the DB query match condition to be that a record's workflow ID must match the specified one, and throw an error if no workflow ID has been specified
  let match_condition = { workflowId };

  if (typeof workflowId === 'object' && !(workflowId instanceof ObjectID)) match_condition = workflowId;

  if (!match_condition.workflowId) throw new Error(`Workflows::retrieve(): the 'workflowId' has not been specified!`);

  match_condition.workflowId = new ObjectID(match_condition.workflowId);

  // Set up any additional options that have been specified via the 'projection' argument
  let options = {};

  if (projection) options.projection = projection;

  // Query the 'workflows' records collection for records matching the match condition and additional options
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

  // If there are no matching records (i.e. the whole of the 'if' statement above is skipped), simply return 'null'
  return null;
}


/// Retrieve all versions of a workflow record
async function versions(workflowId) {
  // Set up the DB query match condition to be that a record's workflow ID must match the specified one, and throw an error if no workflow ID has been specified
  let match_condition = { workflowId };

  if (typeof workflowId === 'object' && !(workflowId instanceof ObjectID)) match_condition = workflowId;

  if (!match_condition.workflowId) throw new Error(`Workflows::versions(): the 'workflowId' has not been specified!`);

  match_condition.workflowId = new ObjectID(match_condition.workflowId);

  // Query the 'workflows' records collection for records matching the match condition
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
  let aggregation_stages = [];

  // If a matching condition has been specified, set it as the first aggregation stage
  if (match_condition) aggregation_stages.push({ $match: match_condition });

  // Keep only the minimal required fields from each record for subsequent aggregation stages (this reduces memory usage)
  aggregation_stages.push({
    $project: {
      workflowId: true,
      typeFormId: true,
      typeFormName: true,
      path: true,
      validity: true,
    }
  })

  // Select only the latest version of each record
  // First sort the matching records by validity ... highest version first
  // Then group the records by the workflow ID (i.e. each group contains all versions of the same workflow), and select only the first (highest version number) entry in each group
  // Finally, set which fields in the first record are to be returned for use in subsequent aggregation stages
  aggregation_stages.push({ $sort: { 'validity.version': -1 } });
  aggregation_stages.push({
    $group: {
      _id: { workflowId: '$workflowId' },
      workflowId: { '$first': '$workflowId' },
      typeFormId: { '$first': '$typeFormId' },
      typeFormName: { '$first': '$typeFormName' },
      stepTypeForms: { '$first': '$path.formName' },
      stepResultIDs: { '$first': '$path.result' },
      lastEditDate: { '$first': '$validity.startDate' },
    },
  });

  // Re-sort the records by last edit date ... most recent first
  aggregation_stages.push({ $sort: { lastEditDate: -1 } });

  // Add aggregation stages for any additionally specified options that should be dealt with at the MongoDB aggregation stage
  if (options) {
    if (options.limit) aggregation_stages.push({ $limit: options.limit });
  }

  // Query the 'workflows' records collection using the aggregation stages defined above
  let records = await db.collection('workflows')
    .aggregate(aggregation_stages)
    .toArray();

  // Add the corresponding component name to each matching record, adjusting it depending on component type for easier readability (i.e. use shortened DUNE PIDs)
  // NOTE: all workflows must have some kind of component name in order to determine where they are being performed in the section below ...
  // ... so any workflow that does not yet have an associated component will be given a temporary fake UK-based component name here, purely for location matching
  for (let record of records) {
    if (record.stepResultIDs[0] != '') {
      const component = await Components.retrieve(record.stepResultIDs[0]);

      if (component) {
        if (component.data.name) {
          if (['APAFrame', 'AssembledAPA'].includes(component.formId)) {
            const name_splits = component.data.name.split('-');
            record.componentName = `${name_splits[1]}-${name_splits[2]}`.slice(0, -3);
          } else {
            record.componentName = component.data.name;
          }
        } else {
          record.componentName = record.stepResultIDs[0];
        }
      }
    } else {
      record.componentName = '99999-UK';
    }
  }

  // If listing 'APA Assembly' workflows, a location will have been specified in the 'options' - use the component name to filter out those workflows that do not match that location
  // If listing any other type of workflow or all workflows regardless of type, no location matching is required and all workflows should 'pass' the filter
  let filtered_records = [];

  if (options.location) {
    for (let record of records) {
      if (record.componentName.slice(6) === options.location) filtered_records.push(record);
    }
  } else {
    filtered_records = [...records];
  }

  // If listing a single type of workflow (i.e. if a match condition was specified), re-sort the records by the component name ... in reverse alphanumerical order
  // This must be done here using JavaScript, rather than as part of the MongoDB aggregation, because component names are only added to the records after the aggregation is complete
  var byField = function (field) {
    return function (a, b) {
      return ((a[field] > b[field]) ? -1 : ((a[field] < b[field]) ? 1 : 0));
    }
  };

  if (match_condition) filtered_records.sort(byField('componentName'));

  // Return the entire list of matching records
  return filtered_records;
}


/// Auto-complete a workflow ID string as it is being typed
/// This function actually returns a list of workflow records with matching workflow IDs to that being typed
async function autoCompleteId(inputString, limit = 10) {
  // Remove any underscores and dashes from the input string
  let q = inputString.replace(/[_-]/g, '');

  // Calculate the minimum and maximum possible hexadecimal values of the input string
  // The workflow ID is 24 alphanumeric characters long, so the minimum value is given by the input string padded out to this length with '0' characters, and the maximum by padding using 'F' characters
  const bitlow = ObjectID(q.padEnd(24, '0'));
  const bithigh = ObjectID(q.padEnd(24, 'F'));

  let aggregation_stages = [];

  // Set up the DB query match condition to be that a record's workflow ID must have a hexidecimal value between the minimum and maximum values calculated above
  let match_condition = {
    workflowId: {
      $gte: bitlow,
      $lte: bithigh,
    },
  };

  aggregation_stages.push({ $match: match_condition });

  // Select only the latest version of each record
  // First sort the matching records by validity ... highest version first
  // Then group the records by the workflow ID (i.e. each group contains all versions of the same workflow), and select only the first (highest version number) entry in each group
  // Finally, set which fields in the first record are to be returned for use in subsequent aggregation stages
  aggregation_stages.push({ $sort: { 'validity.version': -1 } });
  aggregation_stages.push({
    $group: {
      _id: { workflowId: '$workflowId' },
      workflowId: { '$first': '$workflowId' },
      typeFormName: { '$first': '$typeFormName' },
      lastEditDate: { '$first': '$validity.startDate' },
    },
  });

  // Re-sort the records by last edit date ... most recent first
  aggregation_stages.push({ $sort: { lastEditDate: -1 } });

  // Limit the number of returned matching records, just so the interface doesn't get too busy
  aggregation_stages.push({ $limit: limit });

  // Query the 'workflows' records collection using the aggregation stages defined above
  let records = await db.collection('workflows')
    .aggregate(aggregation_stages)
    .toArray();

  // Return the entire list of matching records
  return records;
}


module.exports = {
  save,
  updatePathStep,
  retrieve,
  versions,
  list,
  autoCompleteId,
}
