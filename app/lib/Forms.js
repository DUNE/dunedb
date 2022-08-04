const Cache = require('lib/Cache.js');
const commonSchema = require('lib/commonSchema.js');
const { db } = require('./db');
const dbLock = require('lib/dbLock.js');
const permissions = require('lib/permissions.js');


/// Save a new or edited type form record
async function save(input, collection, req) {
  // Check that the user has permission to create and edit type forms
  if (!permissions.hasPermission(req, 'forms:edit')) throw new Error(`Forms::save() - you do not have permission [forms:edit] to create and/or edit type forms!`);

  // Check that the minimum required information has been provided for a record to be saved
  // For type form records, these are:
  //   - the form ID
  //   - the form name
  //   - the schema, i.e. Formio components and layout (may be empty of content, but must still exist)
  if (!(input instanceof Object)) throw new Error(`Forms::save() - the 'input' object has not been specified!`);
  if (!input.hasOwnProperty('formId')) throw new Error(`Forms::save() - the 'input.formId' has not been specified!`);
  if (!input.hasOwnProperty('formName')) throw new Error(`Forms::save() - the 'input.formName' has not been specified!`);
  if (!input.hasOwnProperty('schema')) throw new Error(`Forms::save() - the 'input.schema' has not been specified!`);

  // Set up a new (initially empty) record object
  let newRecord = {};

  // Add information to the new record, either directly or from the 'input' object
  newRecord.recordType = 'form';
  newRecord.formId = input.formId;
  newRecord.formName = input.formName;
  newRecord.collection = collection;

  if (collection !== 'componentForms') newRecord.componentTypes = input.componentTypes || [];
  if (collection === 'workflowForms') {
    newRecord.description = input.description || '';
    newRecord.path = input.path || [];
  }

  newRecord.tags = input.tags || [];
  newRecord.schema = input.schema;
  newRecord.isBatch = input.isBatch || false;

  // Generate and add an 'insertion' field to the new record
  newRecord.insertion = commonSchema.insertion(req);

  let _lock = await dbLock(`saveTypeForm_${newRecord.formId}`, 1000);

  // Attempt to retrieve an existing record with the same form ID as the specified one (relevant if we are editing an existing record)
  let oldRecord = await retrieve(collection, input.formId);

  // Generate and add a 'validity' field to the new record
  // This may be generated from scratch (for a new record), or via incrementing that of the existing record (if editing)
  newRecord.validity = commonSchema.validity(oldRecord);
  newRecord.validity.ancestor_id = input._id;

  // Insert the new record into the specified records collection
  const result = await db.collection(collection)
    .insertOne(newRecord);

  _lock.release();

  // Throw an error if the insertion fails
  if (result.insertedCount !== 1) throw new Error(`Forms::save() - failed to insert a new type form record into the database!`);

  Cache.invalidate(`formlist_${collection}`);

  // Return the record as proof that it has been saved successfully
  return result.ops[0];
}


/// Retrieve a single version of a type form record (either the most recent, or a specified one)
async function retrieve(collection, formId, projection) {
  // Throw an error if no collection has been specified
  if (!collection) throw new Error(`Forms::retrieve(): the 'collection' has not been specified!`);

  // Throw an error if no form ID has been specified
  if (!collection) throw new Error(`Forms::retrieve(): the 'formId' has not been specified!`);

  // Construct the 'match_condition' to be used as the database query
  // For this function, it is that a record's form ID must match the specified one
  let match_condition = { formId };

  // Set up any additional options that have been specified via the 'projection'
  // For this function, the only additional option will be a specified record version number
  let options = {};

  if (projection) options.projection = projection;

  // Query the specified records collection for records matching the condition and additional options
  // Then sort any matching records such that the most recent version is first in the list
  let records = await db.collection(collection)
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


/// Retrieve a list of all type forms in a specified collection
function getTypeFormList(collection) {
  return async function () {
    // Set up the 'aggregation stages' of the database query - these are the query steps in sequence
    let aggregation_stages = [];

    // First we want to remove all but the most recent version of each matching record
    // Sort the matching records by validity ... highest version first
    aggregation_stages.push({ $sort: { 'validity.version': -1 } });

    // Set up a set of groupings, which will group the records by whatever fields will be subsequently used
    // For example, if the 'formId' of each returned record is to be used later on, it must be one of the groups defined here
    // Note that to start with, this must cover ALL possible groupings across ALL type form collections
    let grouping = {
      $group: {
        _id: '$formId',
        formId: { '$first': '$formId' },
        formName: { '$first': '$formName' },
        tags: { '$first': '$tags' },
        componentTypes: { '$first': '$componentTypes' },
        description: { '$first': '$description' },
        path: { '$first': '$path' },
      }
    }

    // Certain groupings do not apply to certain collections, so remove them as necessary
    if (collection === 'componentForms') delete grouping['$group'].componentTypes;

    if (collection !== 'workflowForms') {
      delete grouping['$group'].description;
      delete grouping['$group'].path;
    }

    // Add the groupings as the next aggregation stage
    aggregation_stages.push(grouping);

    // Query the specified records collection using the aggregation stages
    let records = await db.collection(collection)
      .aggregate(aggregation_stages)
      .toArray();

    // Flatten the set of matching records
    let results = {};

    for (var record of records) {
      results[record.formId] = record;
    }

    // Return the flattened list of type form records
    return results;
  }
}


/// (Re)generate the cache of type forms in a specified collection
Cache.add('formlist_componentForms', getTypeFormList('componentForms'));
Cache.add('formlist_actionForms', getTypeFormList('actionForms'));
Cache.add('formlist_workflowForms', getTypeFormList('workflowForms'));


/// Get the current cached type forms in the specified collection
async function list(collection) {
  const currentCache = Cache.current(`formlist_${collection}`);
  return currentCache;
}


/// Get a list of all currently used type form tags
async function tags() {
  // Simultaneously get lists of type form tags from each type form collection
  // This returns a list containing three sub-lists, one for each collection
  const tags_lists = await Promise.all([
    db.collection('componentForms').distinct('tags'),
    db.collection('actionForms').distinct('tags'),
    db.collection('workflowForms').distinct('tags'),
  ]);

  // Concatenate the three lists, and keep hold of only the unique tags across the concatenation (apart from the 'Trash' tag, which we don't care about)
  let tokens = {};

  for (const tags_list of tags_lists) {
    tokens = tags_list.reduce((acc, curr) => (acc[curr] = 1, acc), tokens);
  }

  delete tokens.Trash;

  // Return an object containing the set of tags, but as keys that can be more easily utilised than a simple array of them
  return Object.keys(tokens);
}


module.exports = {
  save,
  retrieve,
  list,
  tags,
}
