const commonSchema = require('./commonSchema');
const { db } = require('./db');
const dbLock = require('./dbLock');
const permissions = require('./permissions');


/// Save a new or edited type form record
async function save(input, collection, req) {
  // Check that the user has permission to create and edit type forms
  if (!permissions.hasPermission(req, 'forms:edit')) throw new Error(`Forms::save() - you do not have permission [forms:edit] to create and/or edit type forms!`);

  // Check that the minimum required type form information has been provided:
  //   - the form ID
  //   - the form name
  //   - the schema, i.e. Formio components and layout (may be empty of content, but must still exist)
  if (!(input instanceof Object)) throw new Error(`Forms::save() - the 'input' object has not been specified!`);
  if (!input.hasOwnProperty('formId')) throw new Error(`Forms::save() - the 'input.formId' has not been specified!`);
  if (!input.hasOwnProperty('formName')) throw new Error(`Forms::save() - the 'input.formName' has not been specified!`);
  if (!input.hasOwnProperty('schema')) throw new Error(`Forms::save() - the 'input.schema' has not been specified!`);

  // Set up a new record object, and immediately add information, either directly or inherited from the 'input' object
  let newRecord = {};

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

  // Attempt to retrieve an existing record with the same type form ID as the specified one (relevant if we are editing an existing record)
  let oldRecord = await retrieve(collection, input.formId);

  // Generate and add a 'validity' field to the new record, either from scratch (for a new record), or via incrementing that of the existing record (if editing)
  newRecord.validity = commonSchema.validity(oldRecord);
  newRecord.validity.ancestor_id = input._id;

  // Insert the new record into the specified records collection, and throw an error if the insertion fails
  const result = await db.collection(collection)
    .insertOne(newRecord);

  _lock.release();

  if (result.insertedCount !== 1) throw new Error(`Forms::save() - failed to insert a new type form record into the database!`);

  // Return the record as proof that it has been saved successfully
  return result.ops[0];
}


/// Retrieve a single version of a type form record (either the most recent, or a specified one)
async function retrieve(collection, formId, projection) {
  // Throw an appropriate error if no collection or type form ID has been specified
  if (!collection) throw new Error(`Forms::retrieve(): the 'collection' has not been specified!`);
  if (!formId) throw new Error(`Forms::retrieve(): the 'formId' has not been specified!`);

  // Set up the DB query match condition to be that a record's type form ID must match the specified one
  let match_condition = { formId };

  // Set up any additional options that have been specified via the 'projection' argument
  let options = {};

  if (projection) options.projection = projection;

  // Query the specified records collection for records matching the match condition and additional options
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

  // If there are no matching records (i.e. the whole of the 'if' statement above is skipped), simply return 'null'
  return null;
}


/// Retrieve a list of all type forms in a specified collection
async function list(collection) {
  let aggregation_stages = [];

  // Select only the latest version of each record
  // First sort the matching records by validity ... highest version first
  // Then group the records by the type form ID (i.e. each group contains all versions of the same type form), and select only the first (highest version number) entry in each group
  // Note that to start with, this must cover ALL possible groupings across ALL type form collections, but certain groupings do not apply to certain collections, so remove them as necessary
  // Finally, set which fields in the first record are to be returned for use in subsequent aggregation stages
  aggregation_stages.push({ $sort: { 'validity.version': -1 } });

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

  if (collection === 'componentForms') delete grouping['$group'].componentTypes;
  if (collection !== 'workflowForms') {
    delete grouping['$group'].description;
    delete grouping['$group'].path;
  }

  aggregation_stages.push(grouping);

  // Query the specified records collection using the aggregation stages defined above
  let records = await db.collection(collection)
    .aggregate(aggregation_stages)
    .toArray();

  // Reform the query results into an object, with each entry keyed by the type form ID
  let keyedRecords = {};

  for (const record of records) {
    keyedRecords[record.formId] = record;
  }

  // Return the keyed results object
  return keyedRecords;
}


/// Retrieve a list of all type form tags that exist across all type forms
async function tags() {
  // Simultaneously get all type form tags from each individual type form collection ... this returns a list containing three sub-lists, one for each collection
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

  // Return an object containing all unique tags, with each entry keyed by the tag itself
  return Object.keys(tokens);
}


module.exports = {
  save,
  retrieve,
  list,
  tags,
}
