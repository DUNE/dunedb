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
  //   - user-provided data (this may be an empty object, but must still exist)
  if (!(input instanceof Object)) throw new Error(`Components::save() - the 'input' object has not been specified!`);
  if (!input.hasOwnProperty('componentUuid')) throw new Error(`Components::save() - the 'input.componentUuid' has not been specified!`);
  if (!input.hasOwnProperty('formId')) throw new Error(`Components::save() - the 'input.formId' has not been specified!`);
  if (!input.hasOwnProperty('data')) throw new Error(`Components::save() - the 'input.data' has not been specified!`);

  // Check that there is an existing type form corresponding to the the provided type form ID
  const typeFormsList = await Forms.list('componentForms');
  const typeForm = typeFormsList[input.formId];

  if (!typeForm) throw new Error(`Components:save() - the specified 'input.formId' (${input.formId}) does not match a known component type form!`);

  // Set up a new record object, and immediately add some information, either directly or inherited from the 'input' object
  let newRecord = {};

  newRecord.recordType = 'component';
  newRecord.componentUuid = MUUID.from(input.componentUuid);
  newRecord.shortUuid = ShortUUID().fromUUID(input.componentUuid);
  newRecord.formId = input.formId;
  newRecord.formName = typeForm.formName;
  newRecord.data = input.data;

  if (input.workflowId) newRecord.workflowId = input.workflowId;

  // Generate and add an 'insertion' field to the new record
  newRecord.insertion = commonSchema.insertion(req);

  // Check if a record with the same component UUID as the specified one already exists
  // If so (i.e. the returned object is not 'null'), this indicates that we are editing an existing component, and if not (the returned object is 'null'), this is a new component
  let oldRecord = await retrieve(input.componentUuid);

  // Generate and add a 'validity' field to the new record, either from scratch for a new component, or via incrementing that from the existing component's record
  newRecord.validity = commonSchema.validity(oldRecord);
  newRecord.validity.ancestor_id = input._id;

  // If saving a new component record, certain objects and fields need to be set up and populated
  // If editing an existing component records, this same information will either already exist (from being included when the 'input.data' object was copied over above) or can be directly copied
  if (oldRecord === null) {
    // Get a list of the current component count per type across all existing component types, and then get the count of existing components of the same type as this one
    // If the component is a 'Geometry Board' type, offset the count, to account for an unknown number of boards that might have been manufactured before the database was up and running
    const componentTypesAndCounts = await componentCountsByTypes();
    let numberOfExistingComponents = 0;

    if (componentTypesAndCounts[input.formId].count) numberOfExistingComponents = componentTypesAndCounts[input.formId].count;
    if (input.formId === 'GeometryBoard') numberOfExistingComponents += 5000;

    // If the 'input.data' object does NOT contain a 'Type Record Number' field, add the component count to the new record's 'data' object under a new field
    // The field will exist only when creating new records for individual sub-components in a batch, since in this situation the sub-component type record numbers are determined on the client side
    if (!input.data.typeRecordNumber) newRecord.data.typeRecordNumber = numberOfExistingComponents + 1;

    // Components of certain types must have a specifically formatted name, consisting of some fixed prefix and suffix, plus the type record number padded to 5 digits
    // Some other component types can just directly use the type record number as the name, and the remaining types don't need any name specified
    if (input.formId === 'GeometryBoard') {
      newRecord.data.name = `${newRecord.data.typeRecordNumber}`;
    } else if (input.formId === 'GroundingMeshPanel') {
      newRecord.data.name = `D00300200004-${String(newRecord.data.typeRecordNumber).padStart(5, '0')}-UK106-01-00-00`;
    } else if (input.formId === 'CRBoard') {
      newRecord.data.name = `D00300400001-${String(newRecord.data.typeRecordNumber).padStart(5, '0')}-US200-01-00-00`;
    } else if (input.formId === 'GBiasBoard') {
      newRecord.data.name = `D00300400002-${String(newRecord.data.typeRecordNumber).padStart(5, '0')}-US200-01-00-00`;
    } else if (input.formId === 'CEAdapterBoard') {
      newRecord.data.name = `D00300400003-${String(newRecord.data.typeRecordNumber).padStart(5, '0')}-US200-01-00-00`;
    } else if (input.formId === 'SHVBoard') {
      newRecord.data.name = `D00300500001-${String(newRecord.data.typeRecordNumber).padStart(5, '0')}-US200-01-00-00`;
    } else if (input.formId === 'CableHarness') {
      newRecord.data.name = `D00300500002-${String(newRecord.data.typeRecordNumber).padStart(5, '0')}-US200-01-00-00`;
    } else if (input.formId === 'DWA') {
      newRecord.data.name = `D00300800001-${String(newRecord.data.typeRecordNumber).padStart(5, '0')}-US136-01-00-00`;
    } else if (input.formId === 'DWAPDB') {
      newRecord.data.name = `D00300800002-${String(newRecord.data.typeRecordNumber).padStart(5, '0')}-US136-01-00-00`;
    }

    // Set up a new 'Reception' object to hold the component's current location and the date at which it was received at this location ... and we can immediately set the date to be the current one
    // This location information will eventually be changed later for certain component types, but it must exist first in order to do that
    // The 'detail' field can be used to store a string that might contain other addtional information about the component's location
    newRecord.reception = {};
    newRecord.reception.date = (new Date()).toISOString().slice(0, 10);
    newRecord.reception.detail = '';

    // Components of certain types will always start at specific fixed locations, whereas the rest do not need any initial location set (only for the record field to exist)
    if ((input.formId === 'APAFrame') || (input.formId === 'GroundingMeshPanel')) {
      newRecord.reception.location = 'ukWarehouse';
    } else if ((input.formId === 'APAShipment') || (input.formId === 'BoardShipment') || (input.formId === 'CEAdapterBoardShipment') || (input.formId === 'DWAComponentShipment') || (input.formId === 'FrameShipment') || (input.formId === 'GroundingMeshShipment')) {
      newRecord.reception.location = 'in_transit';
    } else if ((input.formId === 'AssembledAPA') || (input.formId === 'wire_bobbin')) {
      newRecord.reception.location = 'daresbury';
    } else if ((input.formId === 'CEAdapterBoard') || (input.formId === 'CRBoard') || (input.formId === 'CableHarness') || (input.formId === 'GBiasBoard') || (input.formId === 'SHVBoard') || (input.formId === 'PopulatedBoardShipment')) {
      newRecord.reception.location = 'wisconsin';
    } else if ((input.formId === 'DWA') || (input.formId === 'DWAPDB')) {
      newRecord.reception.location = newRecord.data.productionLocation;
    } else if (input.formId === 'GeometryBoard') {
      newRecord.reception.location = 'lancaster';
    } else {
      newRecord.reception.location = '';
    }
  } else {
    newRecord.reception = input.reception;
  }

  // Insert the new record into the 'components' records collection, and throw an error if the insertion fails
  let _lock = await dbLock(`saveComponent_${newRecord.componentUuid}`, 1000);

  const result = await db.collection('components')
    .insertOne(newRecord);

  _lock.release();

  if (!result.acknowledged) throw new Error(`Components::save() - failed to insert a new component record into the database!`);

  // If the component is of a certain type, a location and date will have been passed to this function in the 'req.query' object
  // Use these to update the reception information, either for the component itself or for both the component and any sub-components
  // If successful, the updating function returns 'result = 1' in all cases, but we don't actually use this value anywhere
  if (newRecord.formId === 'AssembledAPA') {
    // Update the location information of the APA frame that is referenced by an Assembled APA component, to show that the frame is now being used
    const result = await updateLocation(newRecord.data.frameUuid, req.query.location, req.query.date, newRecord.componentUuid);
  } else if ((newRecord.formId === 'APAShipment') || (newRecord.formId === 'BoardShipment') || (newRecord.formId === 'CEAdapterBoardShipment') || (newRecord.formId === 'DWAComponentShipment') || (newRecord.formId === 'GroundingMeshShipment') || (newRecord.formId === 'PopulatedBoardShipment')) {
    const result = await updateLocations_inShipment(newRecord.componentUuid, req.query.location, req.query.date);
  } else if (newRecord.formId === 'ReturnedGeometryBoardBatch') {
    // Extract the UUID and update the location information of each board in a batch of returned geometry boards to match that from the batch's submission
    for (const board of newRecord.data.boardUuids) {
      const result = await updateLocation(board.component_uuid, req.query.location, req.query.date, '');
    }
  }

  // NOTE: the component that begins any workflow does not count towards the workflow's completion status (only actions do) ... 
  // ... so even if the component originates from a workflow, i.e. the record contains a workflow ID, we do not need to determine the current workflow completion here, as we do for actions

  // If the insertion and post-insertion changes are all successful, return the record's component UUID (in string format) as confirmation
  return MUUID.from(newRecord.componentUuid).toString();
}


/// Update the most recently logged reception location and date of a single component
async function updateLocation(componentUuid, location, date, detail) {
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
          'reception.detail': detail,
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


/// Update the most recently logged reception locations and dates of all sub-components in a shipment-like component
async function updateLocations_inShipment(componentUuid, location, date) {
  // Retrieve the most recent version of the shipment-like component record corresponding to the specified component UUID
  const shipment = await retrieve(componentUuid);

  // Loop over all sub-components in the shipment, and update each one's location information appropriately for the shipment type and contents
  // In all cases, if successful, the updating function returns 'result = 1', but we don't actually use this value anywhere
  if (shipment.formId === 'APAShipment') {
    // Extract the UUID and update the location information of each assembled APA in a shipment of APAs
    for (const apa of shipment.data.apaUuiDs) {
      const result = await updateLocation(apa.component_uuid, location, date, '');
    }
  } else if (shipment.formId === 'BoardShipment') {
    // Extract the UUID and update the location information of each geometry board in a shipment of geometry boards
    for (const board of shipment.data.boardUuiDs) {
      const result = await updateLocation(board.component_uuid, location, date, '');
    }
  } else if (shipment.formId === 'CEAdapterBoardShipment') {
    // Extract the UUID and update the location information of each CE Adapter board in a shipment of CE Adapter boards
    for (const board of shipment.data.ceAdapterBoardUuiDs) {
      const result = await updateLocation(board.component_uuid, location, date, '');
    }
  } else if (shipment.formId === 'DWAComponentShipment') {
    // Extract the UUID and update the location information of each component in a (combined) shipment of DWAs and DWAPDBs
    for (const dwa of shipment.data.componentUUIDs) {
      const result = await updateLocation(dwa.component_uuid, location, date, '');
    }
  } else if (shipment.formId === 'GroundingMeshShipment') {
    // Extract the UUID and update the location information of each mesh in a shipment of meshes
    for (const mesh of shipment.data.apaUuiDs) {
      const result = await updateLocation(mesh.component_uuid, location, date, '');
    }
  } else if (shipment.formId === 'PopulatedBoardShipment') {
    // Extract the UUID and update the location information of each component in a populated kit
    for (const board of shipment.data.crBoardUuiDs) {
      const result = await updateLocation(board.component_uuid, location, date, '');
    }

    for (const board of shipment.data.gBiasBoardUuiDs) {
      const result = await updateLocation(board.component_uuid, location, date, '');
    }

    for (const board of shipment.data.shvBoardUuiDs) {
      const result = await updateLocation(board.component_uuid, location, date, '');
    }

    for (const board of shipment.data.cableHarnessUuiDs) {
      const result = await updateLocation(board.component_uuid, location, date, '');
    }
  }

  // Update the location information of the shipment itself
  const result = await updateLocation(componentUuid, location, date, '');

  // Return the final result (which should be 1)
  return result;
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

  // Keep only the minimal required fields from each record for subsequent aggregation stages (this reduces memory usage)
  aggregation_stages.push({
    $project: {
      componentUuid: true,
      formId: true,
      formName: true,
      data: true,
      shortName: { $substr: ['$data.name', 13, 5] },
      validity: true,
    }
  })

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
      data: { '$first': '$data' },
      name: { '$first': '$data.name' },
      shortName: { '$first': '$shortName' },
      lastEditDate: { '$first': '$validity.startDate' },
    },
  });

  // Re-sort the records ... by (alphanumerical) component name for APA frames and assembled APAs, or by last edit date (most recent first) for other component types
  if ((match_condition) && (match_condition.formId) && ((match_condition.formId === 'APAFrame') || (match_condition.formId === 'AssembledAPA'))) {
    aggregation_stages.push({ $sort: { shortName: -1 } });
  } else {
    aggregation_stages.push({ $sort: { lastEditDate: -1 } });
  }

  // Add aggregation stages for any additionally specified options
  if (options) {
    if (options.limit) aggregation_stages.push({ $limit: options.limit });
  }

  // Query the 'components' records collection using the aggregation stages defined above
  let records = await db.collection('components')
    .aggregate(aggregation_stages)
    .toArray();

  // Convert the 'componentUuid' of each matching record from binary to string format, for better readability and consistent display
  // Additionally, adjust the displayed names of certain component types for easier readability (shorten DUNE PIDs, and use UKIDs for geometry boards)
  for (let record of records) {
    record.componentUuid = MUUID.from(record.componentUuid).toString();

    if (['APAFrame', 'AssembledAPA', 'GroundingMeshPanel', 'CRBoard', 'GBiasBoard', 'CEAdapterBoard', 'SHVBoard', 'CableHarness'].includes(record.typeFormId)) {
      const name_splits = record.name.split('-');
      record.name = `${name_splits[1]}-${name_splits[2]}`.slice(0, -3);
    } else if (record.typeFormId === 'GeometryBoard') {
      record.name = record.data.typeRecordNumber;
    } else {
      record.name = record.name;
    }
  }

  // Return the entire list of matching records
  return records;
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
  updateLocations_inShipment,
  retrieve,
  versions,
  list,
  componentCountsByTypes,
  autoCompleteUuid,
}
