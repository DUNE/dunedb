const MUUID = require('uuid-mongodb');
const ObjectID = require('mongodb').ObjectId;

const commonSchema = require('./commonSchema');
const Components = require('./Components');
const { db } = require('./db');
const dbLock = require('./dbLock');
const Forms = require('./Forms');
const permissions = require('./permissions');
const utils = require('./utils');

// Declare a list of the available 'reception' related action type forms
// NOTE: this must be the same as the equivalent list given in 'static/pages/action_specComponent.js'
const reception_typeFormIDs = ['APAShipmentReception', 'BoardReception', 'CEAdapterBoardReception', 'DWAComponentShipmentReception', 'GroundingMeshShipmentReception', 'PopulatedBoardKitReception'];

// Declare a list of the available 'board installation' and 'mesh installation' action type forms
// NOTE: this must be the same as the equivalent list given in 'static/pages/action_specComponent.js'
const installation_typeFormIDs = [
  'g_foot_board_install', 'g_head_board_install_sideA', 'g_head_board_install_sideB', 'x_foot_board_install', 'x_head_board_install_sideA', 'x_head_board_install_sideB',
  'u_foot_boards_install', 'u_head_board_install_sideA', 'u_head_board_installation_sideB', 'u_side_board_install_HSB', 'u_side_board_install_LSB',
  'v_foot_board_install', 'v_head_board_install_sideA', 'v_head_board_install_sideB', 'v_side_board_install_HSB', 'v_side_board_install_LSB',
  'prep_mesh_panel_install',
];


/// Save a new or edited action record
async function save(input, req) {
  // Check that the user has permission to perform (and re-perform) actions
  if (!permissions.hasPermission(req, 'actions:perform')) throw new Error(`Actions::save() - you do not have permission [actions:perform] to perform actions!`);

  // Check that the minimum required action information has been provided:
  //   - the action type form ID
  //   - the UUID of the component on which the action has been performed
  //   - user-provided data (may be empty of content, but must still exist)
  if (!(input instanceof Object)) throw new Error(`Actions::save() - the 'input' object has not been specified!`);
  if (!input.hasOwnProperty('typeFormId')) throw new Error(`Actions::save() - the 'input.typeFormId' has not been specified!`);
  if (!input.hasOwnProperty('componentUuid')) throw new Error(`Actions::save() - the 'input.componentUuid' has not been specified!`);
  if (!input.hasOwnProperty('data')) throw new Error(`Actions::save() - the 'input.data' has not been specified!`);

  // Check that there is an existing type form corresponding to the the provided type form ID
  const typeFormsList = await Forms.list('actionForms');
  const typeForm = typeFormsList[input.typeFormId];

  if (!typeForm) throw new Error(`Actions:save() - the specified 'input.typeFormId' (${input.typeFormId}) does not match a known action type form!`);

  // Check that the person performing or editing the action is permitted to do so ... this is an additional security check for specific action types, beyond a simple global 'permissions' check
  // It is designed to make sure that these actions are not being performed by the logged-in user on behalf of someone else, without the latter's knowledge or permission 
  if (input.typeFormId === 'AssembledAPAQACheck') {
    if (!(utils.listIDs_apaFactoryLeads.includes(req.user.user_id))) {
      throw new Error(`Actions:save() - you are not permitted to perform or edit this type of action ... it can only be done by one of the following personnel: ${Object.values(utils.dictionary_apaFactoryLeads).join(', ')}`);
    }
  }

  // Check that certain relevant fields do actually have some user-defined data in them if the action is being 'completed' (specific to the particular action type form)
  // This is designed to stop users from performing and 'completing' blank actions in order to skip ahead in workflows, but this way it does not require any fields to be 'required' in the type form
  if (input.data.actionComplete) {
    if ((input.typeFormId === 'x_tension_testing') && (input.data.measuredTensions_sideA.length === 0) && (input.data.measuredTensions_sideB.length === 0)) {
      throw new Error(`Actions:save() - this action does not contain any tension measurements, but has been set as 'complete' ... please uncheck the 'Action Complete' box to submit!`);
    }
  }

  // Set up a new record object, and immediately add information, either directly or inherited from the 'input' object
  let newRecord = {};

  newRecord.recordType = 'action';
  newRecord.actionId = new ObjectID(input.actionId);
  newRecord.typeFormId = input.typeFormId;
  newRecord.typeFormName = typeForm.formName;
  newRecord.componentUuid = MUUID.from(input.componentUuid);
  newRecord.data = input.data;

  if (input.workflowId) newRecord.workflowId = input.workflowId;
  if (input.images) newRecord.images = input.images;

  // Winding and soldering actions each always contain an array of replaced wires or bad solder joints respectively ...
  // ... however, depending on the specific action, this array may not itself contain any information (i.e. there were no replaced wires or bad solders)
  // However, Formio does not allow an empty array - instead, it creates an array with one entry, which is itself full of empty strings
  // This is incorrect but unavoidable behaviour, since if there are no replaced wires or bad solders, the array should indeed be empty ...
  // ... so for these types of action, if the array contains a single entry of empty strings, reset the array to be empty (NOT NULL!) 
  if ((newRecord.typeFormId === 'g_winding') || (newRecord.typeFormId === 'u_winding') || (newRecord.typeFormId === 'v_winding') || (newRecord.typeFormId === 'x_winding')) {
    if (newRecord.data.replacedWires.length === 1) {
      if ((newRecord.data.replacedWires[0].side === '') && (newRecord.data.replacedWires[0].boardLocation === '')) {
        newRecord.data.replacedWires = [];
      }
    }
  }

  if ((newRecord.typeFormId === 'g_solder') || (newRecord.typeFormId === 'u_solder') || (newRecord.typeFormId === 'v_solder') || (newRecord.typeFormId === 'x_solder')) {
    if (newRecord.data.badSolderJoints.length === 1) {
      if ((newRecord.data.badSolderJoints[0].side === '') && (newRecord.data.badSolderJoints[0].boardLocation === '')) {
        newRecord.data.badSolderJoints = [];
      }
    }
  }

  // Generate and add an 'insertion' field to the new record
  newRecord.insertion = commonSchema.insertion(req);

  // Attempt to retrieve an existing record with the same action ID as the specified one (relevant if we are editing an existing record)
  let oldRecord = null;

  if (input.actionId) oldRecord = await retrieve(input.actionId);

  // Generate and add a 'validity' field to the new record, either from scratch (for a new record), or via incrementing that of the existing record (if editing)
  newRecord.validity = commonSchema.validity(oldRecord);
  newRecord.validity.ancestor_id = input._id;

  // Insert the new record into the 'actions' records collection, and throw an error if the insertion fails
  let _lock = await dbLock(`saveAction_${newRecord.actionId}`, 1000);

  const result = await db.collection('actions')
    .insertOne(newRecord);

  _lock.release();

  if (!result.acknowledged) throw new Error(`Actions::save() - failed to insert a new action record into the database!`);

  // If the action is one of the shipment or batch reception types, the reception location and date will have been passed to this function in the 'req.query' object
  // Use these to update the location information for each individual sub-component in the shipment or batch
  // If successful, the updating function returns 'result = 1', but we don't actually use this value anywhere
  if (reception_typeFormIDs.includes(newRecord.typeFormId)) {
    const result = await Components.updateLocations_inShipment(newRecord.componentUuid, req.query.location, req.query.date);
  }

  // If the action is one of the board or mesh installation types, the installation location (always 'installed_on_APA') and date will have been passed to this function in the 'req.query' object
  // Use these to update the location information for each individual board or mesh referenced in this action
  // If successful, the updating function returns 'result = 1', but we don't actually use this value anywhere
  if (installation_typeFormIDs.includes(newRecord.typeFormId)) {
    const uuid_format = new RegExp(/[A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12}/);

    for (const [key, value] of Object.entries(newRecord.data)) {
      if (uuid_format.test(value)) {
        if (req.query.location === 'installed_on_APA') {
          const result = await Components.updateLocation(value, req.query.location, req.query.date, newRecord.componentUuid);
        } else {
          const result = await Components.updateLocation(value, req.query.location, req.query.date, '');
        }
      }
    }
  }

  // If the insertion and post-insertion changes are all successful, return the record's action ID as confirmation
  return newRecord.actionId;
}


/// Add one or more base64-encoded strings, each one representing a single image, to a specified action record
async function addImageStrings(actionId, imageStringsArray) {
  // Set up the DB query match condition to be that a record's action ID must match the specified one
  let match_condition = { actionId };

  if (typeof actionId === 'object' && !(actionId instanceof ObjectID)) match_condition = actionId;

  match_condition.actionId = new ObjectID(match_condition.actionId);

  // Use the MongoDB '$set' operator to directly edit the values of the relevant fields in the action record, and throw an error if the edit fails
  const result = db.collection('actions')
    .findOneAndUpdate(
      match_condition,
      {
        $push: { 'images': { $each: imageStringsArray } }
      },
      {
        sort: { 'validity.version': -1 },
        returnNewDocument: true,
      },
    );

  if (result.ok === 0) throw new Error(`Actions::addImageStrings() - failed to update the action record!`);

  // If the edit is successful, return the record's action ID as confirmation
  return actionId;
}


/// Retrieve a single version of an action record (either the most recent, or a specified one)
async function retrieve(actionId, projection) {
  // Set up the DB query match condition to be that a record's action ID must match the specified one, and throw an error if no action ID has been specified
  let match_condition = { actionId };

  if (typeof actionId === 'object' && !(actionId instanceof ObjectID)) match_condition = actionId;

  if (!match_condition.actionId) throw new Error(`Actions::retrieve(): the 'actionId' has not been specified!`);

  match_condition.actionId = new ObjectID(match_condition.actionId);

  // Set up any additional options that have been specified via the 'projection' argument
  let options = {};

  if (projection) options.projection = projection;

  // Query the 'actions' records collection for records matching the match condition and additional options
  // Then sort any matching records such that the most recent version is first in the list
  let records = await db.collection('actions')
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


/// Retrieve all versions of an action record
async function versions(actionId) {
  // Set up the DB query match condition to be that a record's action ID must match the specified one, and throw an error if no action ID has been specified
  let match_condition = { actionId };

  if (typeof actionId === 'object' && !(actionId instanceof ObjectID)) match_condition = actionId;

  if (!match_condition.actionId) throw new Error(`Actions::versions(): the 'actionId' has not been specified!`);

  match_condition.actionId = new ObjectID(match_condition.actionId);

  // Query the 'actions' records collection for records matching the match condition
  // Then sort any matching records such that the most recent version is first in the list
  let records = await db.collection('actions')
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


/// Retrieve a list of action records matching a specified condition
async function list(match_condition, options) {
  let aggregation_stages = [];

  // If a matching condition has been specified, set it as the first aggregation stage
  // If the matching condition additionally contains a (string format) component UUID, first convert it to binary format
  if (match_condition) {
    if (match_condition.componentUuid) match_condition.componentUuid = MUUID.from(match_condition.componentUuid);

    aggregation_stages.push({ $match: match_condition });
  }

  // Keep only the minimal required fields from each record for subsequent aggregation stages (this reduces memory usage)
  aggregation_stages.push({
    $project: {
      actionId: true,
      typeFormId: true,
      typeFormName: true,
      componentUuid: true,
      validity: true,
    }
  })

  // Select only the latest version of each record
  // First sort the matching records by validity ... highest version first
  // Then group the records by the action ID (i.e. each group contains all versions of the same action), and select only the first (highest version number) entry in each group
  // Finally, set which fields in the first record are to be returned for use in subsequent aggregation stages
  aggregation_stages.push({ $sort: { 'validity.version': -1 } });
  aggregation_stages.push({
    $group: {
      _id: { actionId: '$actionId' },
      actionId: { '$first': '$actionId' },
      typeFormId: { '$first': '$typeFormId' },
      typeFormName: { '$first': '$typeFormName' },
      componentUuid: { '$first': '$componentUuid' },
      lastEditDate: { '$first': '$validity.startDate' },
    },
  });

  // Re-sort the records by last edit date ... most recent first
  aggregation_stages.push({ $sort: { lastEditDate: -1 } });

  // Add aggregation stages for any additionally specified options
  if (options) {
    if (options.limit) aggregation_stages.push({ $limit: options.limit });
  }

  // Query the 'actions' records collection using the aggregation stages defined above
  let records = await db.collection('actions')
    .aggregate(aggregation_stages)
    .toArray();

  // Convert the 'componentUuid' of each matching record from binary to string format, for better readability and consistent display
  // Then add the corresponding component name to each matching record, adjusting it depending on component type for easier readability (shorten DUNE PIDs, and use UKIDs for geometry boards)
  for (let record of records) {
    record.componentUuid = MUUID.from(record.componentUuid).toString();

    const component = await Components.retrieve(record.componentUuid);

    if (!component) {
      record.componentName = '[UUID does not exist!]';
    } else {
      if (component.data.name) {
        if (['APAFrame', 'AssembledAPA', 'GroundingMeshPanel', 'CRBoard', 'GBiasBoard', 'CEAdapterBoard', 'SHVBoard', 'CableHarness'].includes(component.formId)) {
          const name_splits = component.data.name.split('-');
          record.componentName = `${name_splits[1]}-${name_splits[2]}`.slice(0, -3);
        } else if (component.formId === 'GeometryBoard') {
          record.componentName = component.data.typeRecordNumber;
        } else {
          record.componentName = component.data.name;
        }
      } else {
        record.componentName = record.componentUuid;
      }
    }
  }

  // Return the entire list of matching records
  return records;
}


/// Auto-complete an action ID string as it is being typed
/// This function actually returns a list of action records with matching action IDs to that being typed
async function autoCompleteId(inputString, limit = 10) {
  // Remove any underscores and dashes from the input string
  let q = inputString.replace(/[_-]/g, '');

  // Calculate the minimum and maximum possible hexadecimal values of the input string
  // The action ID is 24 alphanumeric characters long, so the minimum value is given by the input string padded out to this length with '0' characters, and the maximum by padding using 'F' characters
  const bitlow = ObjectID(q.padEnd(24, '0'));
  const bithigh = ObjectID(q.padEnd(24, 'F'));

  let aggregation_stages = [];

  // Set up the DB query match condition to be that a record's action ID must have a hexidecimal value between the minimum and maximum values calculated above
  let match_condition = {
    actionId: {
      $gte: bitlow,
      $lte: bithigh,
    },
  };

  aggregation_stages.push({ $match: match_condition });

  // Select only the latest version of each record
  // First sort the matching records by validity ... highest version first
  // Then group the records by the action ID (i.e. each group contains all versions of the same action), and select only the first (highest version number) entry in each group
  // Finally, set which fields in the first record are to be returned for use in subsequent aggregation stages
  aggregation_stages.push({ $sort: { 'validity.version': -1 } });
  aggregation_stages.push({
    $group: {
      _id: { actionId: '$actionId' },
      actionId: { '$first': '$actionId' },
      typeFormName: { '$first': '$typeFormName' },
      lastEditDate: { '$first': '$validity.startDate' },
    },
  });

  // Re-sort the records by last edit date ... most recent first
  aggregation_stages.push({ $sort: { lastEditDate: -1 } });

  // Limit the number of returned matching records, just so the interface doesn't get too busy
  aggregation_stages.push({ $limit: limit });

  // Query the 'actions' records collection using the aggregation stages defined above
  let records = await db.collection('actions')
    .aggregate(aggregation_stages)
    .toArray();

  // Return the entire list of matching records
  return records;
}


module.exports = {
  save,
  addImageStrings,
  retrieve,
  versions,
  list,
  autoCompleteId,
}
