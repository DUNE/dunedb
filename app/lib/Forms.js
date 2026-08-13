const { db } = require('./db');
const dbLock = require('./dbLock');
const permissions = require('./permissions');


/// Save a new or edited type form record
async function save(input, collection, req) {
  // Check that the user has permission to create and edit type forms
  if (!permissions.hasPermission(req, 'forms:edit')) throw new Error(`Forms::save() - you do not have permission [forms:edit] to create and/or edit type forms!`);

  // Check that the minimum required type form information has been provided:
  //   - the type form ID
  //   - the type form name
  //   - the schema, i.e. Formio components and layout (this may be an empty object, but must still exist)
  //   - the submitting user's profile information
  if (!(input instanceof Object)) throw new Error(`Forms::save() - the 'input' object has not been specified!`);
  if (!input.hasOwnProperty('typeFormId')) throw new Error(`Forms::save() - the 'input.typeFormId' has not been specified!`);
  if (!input.hasOwnProperty('typeFormName')) throw new Error(`Forms::save() - the 'input.typeFormName' has not been specified!`);
  if (!input.hasOwnProperty('schema')) throw new Error(`Forms::save() - the 'input.schema' has not been specified!`);
  if (!(req instanceof Object)) throw new Error(`Forms::save() - the 'req' object has not been specified!`);
  if (!req.hasOwnProperty('user')) throw new Error(`Forms::save() - the 'req.user' has not been specified!`);

  // Check if a record with the same type form ID as the specified one already exists in the records collection
  // If so (i.e. the returned object is not 'null'), this indicates that we are editing an existing type form, and if not (the returned object is 'null'), this is a new type form
  let oldRecord = await retrieve(collection, input.typeFormId);

  // Set up a new record object, and immediately add some information, either directly or inherited from the 'input' object
  let newRecord = {};

  newRecord.recordType = 'form';
  newRecord.recordDate = new Date();
  newRecord.recordVersion = (oldRecord === null) ? 1 : parseInt(oldRecord.recordVersion) + 1;
  newRecord.collection = collection;
  newRecord.typeFormId = input.typeFormId;
  newRecord.typeFormName = input.typeFormName;
  newRecord.tags = input.tags || [];

  if (collection === 'componentForms') {
    newRecord.isBatch = input.isBatch || false;
  } else if (collection === 'actionForms') {
    newRecord.componentTypes = input.componentTypes || [];
  } else if (collection === 'workflowForms') {
    newRecord.componentTypes = input.componentTypes || [];
    newRecord.description = input.description || '';
    newRecord.path = input.path || [];
  }

  newRecord.userId = req.user.user_id;
  newRecord.userName = req.user.displayName;
  newRecord.userEmail = req.user.emails[0].value;

  newRecord.schema = input.schema;

  // Insert the new record into the specified records collection, and throw an error if the insertion fails
  let _lock = await dbLock(`saveTypeForm_${newRecord.typeFormId}`, 1000);

  const result = await db.collection(collection)
    .insertOne(newRecord);

  _lock.release();

  if (!result.acknowledged) throw new Error(`Forms::save() - failed to insert a new type form record into the database!`);

  // If the insertion is successful, return the record's type form ID as confirmation
  return newRecord.typeFormId;
}


/// Retrieve a single version of a type form record (either the most recent, or a specified one)
async function retrieve(collection, typeFormId, projection) {
  // Throw an appropriate error if no collection or type form ID has been specified
  if (!collection) throw new Error(`Forms::retrieve(): the 'collection' has not been specified!`);
  if (!typeFormId) throw new Error(`Forms::retrieve(): the 'typeFormId' has not been specified!`);

  // Set up the DB query match condition to be that a record's type form ID must match the specified one
  let match_condition = { typeFormId };

  // Set up any additional options that have been specified via the 'projection' argument
  let options = {};

  if (projection) options.projection = projection;

  // Query the specified records collection for records matching the match condition and additional options
  // Then sort any matching records such that the most recent version is first in the list
  let records = await db.collection(collection)
    .find(match_condition, options)
    .sort({ 'recordVersion': -1 })
    .toArray();

  // If there is at least one matching record ...
  if (records.length > 0) {
    // Return the first matching record
    return records[0];
  }

  // If there are no matching records (i.e. the whole of the 'if' statement above is skipped), simply return 'null'
  return null;
}


/// Retrieve a list of all type forms in a specified collection
async function list(collection) {
  let aggregation_stages = [];

  // Select only the latest version of each record
  // First sort the matching records by record version ... highest first
  // Then group the records by the type form ID (i.e. each group contains all versions of the same type form), and select only the first (highest version number) entry in each group
  // Note that to start with, this must cover ALL possible groupings across ALL type form collections, but certain groupings do not apply to certain collections, so remove them as necessary
  // Finally, set which fields in the first record are to be returned for use in subsequent aggregation stages
  aggregation_stages.push({ $sort: { 'recordVersion': -1 } });

  let grouping = {
    $group: {
      _id: '$typeFormId',
      typeFormId: { '$first': '$typeFormId' },
      typeFormName: { '$first': '$typeFormName' },
      tags: { '$first': '$tags' },
      componentTypes: { '$first': '$componentTypes' },
      path: { '$first': '$path' },
    }
  }

  if (collection === 'componentForms') delete grouping['$group'].componentTypes;
  if (collection !== 'workflowForms') {
    delete grouping['$group'].path;
  }

  aggregation_stages.push(grouping);

  // Sort the records into alphabetical order
  aggregation_stages.push({ $sort: { typeFormName: 1 } });

  // Query the specified records collection using the aggregation stages defined above
  let records = await db.collection(collection)
    .aggregate(aggregation_stages)
    .toArray();

  // Reform the query results into an object, with each entry keyed by the type form ID
  let keyedRecords = {};

  for (const record of records) {
    keyedRecords[record.typeFormId] = record;
  }

  // Return the keyed results object
  return keyedRecords;
}


/// Retrieve a list of all type forms in a specified collection, grouped by some field present in each record in the collection
async function listGrouped(collection) {
  let aggregation_stages = [];

  // Select only the latest version of each record
  // First sort the matching records by record version ... highest first
  // Then group the records by the type form ID (i.e. each group contains all versions of the same type form), and select only the first (highest version number) entry in each group
  // Note that to start with, this must cover ALL possible groupings across ALL type form collections, but certain groupings do not apply to certain collections, so remove them as necessary
  // Finally, set which fields in the first record are to be returned for use in subsequent aggregation stages
  aggregation_stages.push({ $sort: { 'recordVersion': -1 } });

  let grouping = {
    $group: {
      _id: '$typeFormId',
      typeFormId: { '$first': '$typeFormId' },
      typeFormName: { '$first': '$typeFormName' },
      tags: { '$first': '$tags' },
      componentTypes: { '$first': '$componentTypes' },
      path: { '$first': '$path' },
    }
  }

  if (collection === 'componentForms') delete grouping['$group'].componentTypes;
  if (collection !== 'workflowForms') {
    delete grouping['$group'].path;
  }

  aggregation_stages.push(grouping);

  // For the 'actionForms' collection specifically, we want to return the list of type forms grouped by the 'recommended component type'
  // Note that because the 'recommended component type' field is an ARRAY in the action type form, we must first 'unwind' it before grouping the records against its contents
  // For each group of action type forms, the '_id' will be returned (i.e. the recommended component type that this group is defined by), as well as additional fields from the type form records
  // Sort the groups alphabetically by the recommended component type
  if (collection === 'actionForms') {
    aggregation_stages.push({ $unwind: '$componentTypes' });

    aggregation_stages.push({
      $group: {
        _id: { componentType: '$componentTypes' },
        typeFormId: { $push: '$typeFormId' },
        typeFormName: { $push: '$typeFormName' },
        tags: { $push: '$tags' },
      }
    });

    aggregation_stages.push({ $sort: { '_id.componentType': 1 } });
  }

  // Query the specified records collection using the aggregation stages defined above
  let records = await db.collection(collection)
    .aggregate(aggregation_stages)
    .toArray();

  // For all collections except the (grouped) action type forms, reform the query results into an object, with each entry keyed by the type form ID, and then returned the keyed results object
  // For the action type forms collection, simply return the grouped records ... they will be reworked into a more easily displayed format on the interface page itself
  if (collection !== 'actionForms') {
    let keyedRecords = {};

    for (const record of records) {
      keyedRecords[record.typeFormId] = record;
    }

    return keyedRecords;
  } else {
    return records;
  }
}


module.exports = {
  save,
  retrieve,
  list,
  listGrouped,
}
