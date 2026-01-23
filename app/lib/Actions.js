const MUUID = require('uuid-mongodb');
const ObjectId = require('mongodb').ObjectId;

const commonSchema = require('./commonSchema');
const Components = require('./Components');
const { db } = require('./db');
const dbLock = require('./dbLock');
const Forms = require('./Forms');
const permissions = require('./permissions');
const utils = require('./utils');

// Declare a list of the available 'shipment transport' related action type forms
// NOTE: this must be the same as the equivalent list given in 'static/pages/action_specComponent.js'
const transport_typeFormIDs = ['APAShipmentTransport'];

// Declare a list of the available 'reception' related action type forms
// NOTE: this must be the same as the equivalent list given in 'static/pages/action_specComponent.js'
const reception_typeFormIDs = ['APAShipmentReception', 'BoardReception', 'CEAdapterBoardReception', 'DWAComponentShipmentReception', 'GroundingMeshShipmentReception', 'PopulatedBoardKitReception'];

// Declare a list of the available 'board installation' and 'mesh installation' action type forms
// NOTE: this must be the same as the equivalent list given in 'static/pages/action_specComponent.js'
const installation_typeFormIDs = ['x_boards', 'v_boards', 'u_boards', 'g_boards', 'prep_mesh_panel_install'];


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

  // Some action types should be submitted only by the APA Factory Leads - these are typically the most important and/or highest level QA checks and signoffs
  // Check that the submitter (i.e. the currently logged-in user) is the same as the person who's name is being used for the QA signoff ... if not, do not allow the action to be submitted
  // Since the list of personnel for QA signoffs is always only the APA Factory Leads, this check should restrict such actions to only be submittable by leads WHEN LOGGED IN AS THEMSELVES
  if (input.typeFormId === 'AssembledAPAQACheck') {
    if (req.user.displayName !== utils.dictionary_apaFactoryLeads[input.data.personSigningOff]) {
      throw new Error(`Actions:save() - the current user (${req.user.displayName}) is attempting to sign off the QA Checks on behalf of someone else (${utils.dictionary_apaFactoryLeads[input.data.personSigningOff]}) - this is not permitted!`);
    }
  }

  if (input.typeFormId === 'CompletedAPAQCChecklist') {
    if (req.user.displayName !== utils.dictionary_apaFactoryLeads[input.data.personSigningOff]) {
      throw new Error(`Actions:save() - the current user (${req.user.displayName}) is attempting to sign off the APA Final Assembly on behalf of someone else (${utils.dictionary_apaFactoryLeads[input.data.personSigningOff]}) - this is not permitted!`);
    }
  }

  if (input.typeFormId === 'prep_mesh_panel_install') {
    if ((req.user.displayName !== utils.dictionary_dBandFramePrep[input.data.meshPanelQCBy]) && (input.data.actionComplete)) {
      throw new Error(`Actions:save() - the current user (${req.user.displayName}) is attempting to sign off the Installation QA and complete this action on behalf of someone else (${utils.dictionary_dBandFramePrep[input.data.meshPanelQCBy]}) - this is not permitted!`);
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
  newRecord.actionId = new ObjectId(input.actionId);
  newRecord.typeFormId = input.typeFormId;
  newRecord.typeFormName = typeForm.formName;
  newRecord.componentUuid = MUUID.from(input.componentUuid);

  const componentRecord = await Components.retrieve(newRecord.componentUuid);

  if (componentRecord) {
    newRecord.componentName = componentRecord.data.componentName;
    newRecord.componentTypeFormId = componentRecord.formId;
    newRecord.componentTypeFormName = componentRecord.formName;
  } else {
    newRecord.componentName = '[no component record found!]';
    newRecord.componentTypeFormId = '[no component record found!]';
    newRecord.componentTypeFormName = '[no component record found!]';
  }

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

  // NCR actions each always contain (4) arrays of damaged, misplaced, missing and shorted wires ...
  // ... however, depending on the specific user input, any number of them may not contain any information
  // Formio doesn't like this, and can sometimes write a partial (single) non-empty entry to any unused array ... which can lead to the APA Executive Summary not being created correctly
  // For these types of action, check if each array contains a single partial entry, and if so replace it with a correct and complete one
  const correctedEntry = {
    wireLayer: '',
    readoutChannel: null,
    headBoardAndPad: '',
    coldElectronicsChannel: '',
    textField: '',
    offlineChannel: '',
    endPointsForMissingSegments: '',
  };

  if (newRecord.typeFormId === 'APANonConformance') {
    if (newRecord.data.damagedWireGrid.length === 1) {
      if (!newRecord.data.damagedWireGrid[0].hasOwnProperty('wireLayer')) {
        newRecord.data.damagedWireGrid[0] = correctedEntry;
      }
    }

    if (newRecord.data.misplacedGrid.length === 1) {
      if (!newRecord.data.misplacedGrid[0].hasOwnProperty('wireLayer')) {
        newRecord.data.misplacedGrid[0] = correctedEntry;
      }
    }

    if (newRecord.data.dataGrid.length === 1) {
      if (!newRecord.data.dataGrid[0].hasOwnProperty('wireLayer')) {
        newRecord.data.dataGrid[0] = correctedEntry;
      }
    }

    if (newRecord.data.shortedGrid.length === 1) {
      if (!newRecord.data.shortedGrid[0].hasOwnProperty('wireLayer')) {
        newRecord.data.shortedGrid[0] = correctedEntry;
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

  // Once the action record has been successfully saved, deal with the reception information for any related components
  // - for shipment transport actions, update the reception information of each individual sub-component (as well as the shipment itself) to be 'In Transit'
  // - for shipment or batch reception actions, update the reception information of each individual sub-component (as well as the shipment itself) to match where and when it was received
  // - for board and mesh installation actions, update the reception information of each component referenced in the action to be 'Installed on APA' 
  // - for 'Factory Board Rejection' actions ...
  //   ... where the rejection disposition is 'Rejected', update the board's reception information to indicate that it has been 'Rejected'
  //   ... where the rejection disposition is something other than 'Rejected', update the board's reception information to match where and when the action was performed
  // - for 'Tooth Strip Attachment' actions, update the board's reception information to match where and when the action was performed
  // - for some (but not all) actions performed on grounding mesh panels, update the mesh's reception information to match where and when the action was performed
  // In all cases, if successful, the updating function returns 'result = 1' in all cases, but we don't actually use this value anywhere
  if (transport_typeFormIDs.includes(newRecord.typeFormId)) {
    const result = await Components.updateLocations_inShipment(newRecord.componentUuid, 'in_transit', (new Date()).toISOString().slice(0, 10));
  } else if (reception_typeFormIDs.includes(newRecord.typeFormId)) {
    const result = await Components.updateLocations_inShipment(newRecord.componentUuid, newRecord.data.receptionLocation, (newRecord.data.receptionDate).toString().slice(0, 10));
  } else if (installation_typeFormIDs.includes(newRecord.typeFormId)) {
    if (newRecord.typeFormId === 'prep_mesh_panel_install') {
      const uuid_format = new RegExp(/[A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12}/);

      for (const [key, value] of Object.entries(newRecord.data)) {
        if (uuid_format.test(value)) {
          const result = await Components.updateLocation(value, 'installed_on_APA', (new Date()).toISOString().slice(0, 10), newRecord.componentUuid);
        }
      }
    } else {
      for (const board of newRecord.data.headBoardsA) {
        if (board.boardUuid !== '') {
          const result = await Components.updateLocation(board.boardUuid, 'installed_on_APA', (new Date()).toISOString().slice(0, 10), newRecord.componentUuid);
        }
      }

      for (const board of newRecord.data.headBoardsB) {
        if (board.boardUuid !== '') {
          const result = await Components.updateLocation(board.boardUuid, 'installed_on_APA', (new Date()).toISOString().slice(0, 10), newRecord.componentUuid);
        }
      }

      for (const board of newRecord.data.footBoards) {
        if (board.boardUuid !== '') {
          const result = await Components.updateLocation(board.boardUuid, 'installed_on_APA', (new Date()).toISOString().slice(0, 10), newRecord.componentUuid);
        }
      }

      if (newRecord.data.sideBoardsHSB) {
        for (const board of newRecord.data.sideBoardsHSB) {
          if (board.boardUuid !== '') {
            const result = await Components.updateLocation(board.boardUuid, 'installed_on_APA', (new Date()).toISOString().slice(0, 10), newRecord.componentUuid);
          }
        }

        for (const board of newRecord.data.sideBoardsLSB) {
          if (board.boardUuid !== '') {
            const result = await Components.updateLocation(board.boardUuid, 'installed_on_APA', (new Date()).toISOString().slice(0, 10), newRecord.componentUuid);
          }
        }
      }
    }
  } else if (newRecord.typeFormId === 'FactoryBoardRejection') {
    const rejectionLocation = utils.dictionary_locations[newRecord.data.boardRejectionLocation];

    if (newRecord.data.disposition === 'rejected') {
      let rejectionReason = '';

      if (newRecord.data.reasonForRejectionFromInventory.step) { rejectionReason = 'Step Failure' }
      else if (newRecord.data.reasonForRejectionFromInventory.solderMaskScratch) { rejectionReason = 'Solder Mask Scratch' }
      else if (newRecord.data.reasonForRejectionFromInventory.scratchInCopperTrace) { rejectionReason = 'Copper Trace Scratch' }
      else if (newRecord.data.reasonForRejectionFromInventory.brokenTooth) { rejectionReason = 'Broken Tooth' }
      else if (newRecord.data.reasonForRejectionFromInventory.delaminationOfLayers) { rejectionReason = 'Delamination of Layers' }
      else if (newRecord.data.reasonForRejectionFromInventory.bentPins) { rejectionReason = 'Bent Pins' }
      else if (newRecord.data.reasonForRejectionFromInventory.epoxyOnSolderPadsOrToothStrip) { rejectionReason = 'Misplaced Epoxy' }
      else if (newRecord.data.reasonForRejectionFromInventory.toothStripNotProperlyAttached) { rejectionReason = 'Misattached Tooth Strip' }
      else if (newRecord.data.reasonForRejectionFromInventory.qrCodeIssue) { rejectionReason = 'QR Code Issue' }
      else if (newRecord.data.reasonForRejectionFromInventory.installationCausedDamage) { rejectionReason = 'Installation Damage' }
      else if (newRecord.data.reasonForRejectionFromInventory.removedFromApa) { rejectionReason = 'Removed from APA' }
      else if (newRecord.data.reasonForRejectionFromInventory.other) { rejectionReason = 'Unspecified Reason' }

      const result = await Components.updateLocation(newRecord.componentUuid, 'rejected', (new Date()).toISOString().slice(0, 10), `[${rejectionLocation} - ${rejectionReason}]`);
    } else {
      const result = await Components.updateLocation(newRecord.componentUuid, newRecord.data.boardRejectionLocation, (new Date()).toISOString().slice(0, 10), '');
    }
  } else if (newRecord.typeFormId === 'BoardToothStripAttachment') {
    const result = await Components.updateLocation(newRecord.componentUuid, newRecord.data.locationWorkPerformed, (new Date()).toISOString().slice(0, 10), '');
  } else if (['EpoxyApplication', 'FinalInspection', 'ReceiptInspection'].includes(newRecord.typeFormId)) {
    const result = await Components.updateLocation(newRecord.componentUuid, newRecord.data.location, newRecord.data.date.slice(0, 10), '');
  }

  // If the insertion and post-insertion changes are all successful, return the record's action ID as confirmation
  return newRecord.actionId;
}


/// Add one or more base64-encoded strings, each one representing a single image, to a specified action record
async function addImageStrings(actionId, imageStringsArray, imageType) {
  // Set up the DB query match condition to be that a record's action ID must match the specified one
  let match_condition = { actionId };

  if (typeof actionId === 'object' && !(actionId instanceof ObjectId)) match_condition = actionId;

  match_condition.actionId = new ObjectId(match_condition.actionId);

  let result = null;

  if (imageType === 'shocklogger') {
    // Use the MongoDB '$set' operator to populate the 'data.shockloggerPlots' field in the action record with the new image (overwriting any existing data), and throw an error if the edit fails
    result = await db.collection('actions')
      .findOneAndUpdate(
        match_condition,
        {
          $set: { 'data.shocklogPlotsImage': imageStringsArray[0] }
        },
        {
          sort: { 'validity.version': -1 },
          returnNewDocument: true,
          includeResultMetadata: true,
        },
      );
  } else if (imageType === 'general') {
    // Use the MongoDB '$push' operator to append all provided images to the 'images' array in the action record, and throw an error if the edit fails
    result = await db.collection('actions')
      .findOneAndUpdate(
        match_condition,
        {
          $push: { 'images': { $each: imageStringsArray } }
        },
        {
          sort: { 'validity.version': -1 },
          returnNewDocument: true,
          includeResultMetadata: true,
        },
      );
  }

  if (result.ok === 0) throw new Error(`Actions::addImageStrings() - failed to update the action record!`);

  // If the edit is successful, return the record's action ID as confirmation
  return actionId;
}


/// Remove an image from an action record
async function removeImageString(actionId, imageNumber) {
  // Retrieve the action record, and then the string corresponding to the image
  const action = await retrieve(actionId);
  const imageString = action.images[imageNumber - 1];

  // Set up the DB query match condition to be that a record's action ID must match the specified one
  let match_condition = { actionId };

  if (typeof actionId === 'object' && !(actionId instanceof ObjectId)) match_condition = actionId;

  match_condition.actionId = new ObjectId(match_condition.actionId);

  // Use the MongoDB '$pull' operator to remove the images' array entry which has a value matching the image string, and throw an error if the edit fails
  const result = await db.collection('actions')
    .findOneAndUpdate(
      match_condition,
      {
        $pull: { 'images': imageString }
      },
      {
        sort: { 'validity.version': -1 },
        returnNewDocument: true,
        includeResultMetadata: true,
      },
    );

  if (result.ok === 0) throw new Error(`Actions::removeImageString() - failed to update the action record!`);

  // If the edit is successful, return the record's action ID as confirmation
  return actionId;
}


/// Retrieve a single version of an action record (either the most recent, or a specified one)
async function retrieve(actionId, projection) {
  // Set up the DB query match condition to be that a record's action ID must match the specified one, and throw an error if no action ID has been specified
  let match_condition = { actionId };

  if (typeof actionId === 'object' && !(actionId instanceof ObjectId)) match_condition = actionId;

  if (!match_condition.actionId) throw new Error(`Actions::retrieve(): the 'actionId' has not been specified!`);

  match_condition.actionId = new ObjectId(match_condition.actionId);

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

  if (typeof actionId === 'object' && !(actionId instanceof ObjectId)) match_condition = actionId;

  if (!match_condition.actionId) throw new Error(`Actions::versions(): the 'actionId' has not been specified!`);

  match_condition.actionId = new ObjectId(match_condition.actionId);

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
async function list(match_condition) {
  let aggregation_stages = [];

  // The passed match condition will usually contain an action type form ID ... set it as the first aggregation stage
  // If the matching condition also contains a (string format) component UUID, convert it to binary format
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
      componentName: true,
      workflowId: true,
      validity: true,
      data: true,
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
      componentName: { '$first': '$componentName' },
      workflowId: { '$first': '$workflowId' },
      lastEditDate: { '$first': '$validity.startDate' },
      data: { '$first': '$data' },
    },
  });

  // Re-sort the records by last edit date ... most recent first
  aggregation_stages.push({ $sort: { lastEditDate: -1 } });

  // Limit the number of returned records to something reasonable ... this will be further reduced later on, but only after the optional filter on component type form ID has been applied if needed
  aggregation_stages.push({ $limit: 1000 });

  // Query the 'actions' records collection using the aggregation stages defined above
  let records = await db.collection('actions')
    .aggregate(aggregation_stages)
    .toArray();

  // Return a limited slice of the matching records
  return records.slice(0, 200);
}


/// Get a list of geometry board rejection counts across all [board part number, rejection location] combinations
/// This function does not take any user-specified arguments
async function boardRejectionCounts_byPartNumberAndLocation() {
  let aggregation_stages = [];

  // Match against the component type form ID and reception location to get records of all 'Geometry Board' components with a current reception location of 'rejected'
  aggregation_stages.push({
    $match: {
      'formId': 'GeometryBoard',
      'reception.location': 'rejected',
    }
  });

  // Select only the latest version of each record
  // First sort the matching records by validity ... highest version first
  // Then group the records by the component UUID (i.e. each group contains all versions of the same component), and select only the first (highest version number) entry in each group
  // Finally, set which fields in the first record are to be returned for use in subsequent aggregation stages
  aggregation_stages.push({ $sort: { 'validity.version': -1 } });
  aggregation_stages.push({
    $group: {
      _id: { componentUuid: '$componentUuid' },
      componentUuid: { '$first': '$componentUuid' },
      partNumber: { '$first': '$data.partNumber' },
      rejectionDetail: { '$first': '$reception.detail' },
    },
  });

  // Query the 'components' records collection using the aggregation stages defined above
  let records = await db.collection('components')
    .aggregate(aggregation_stages)
    .toArray();

  // Set up arrays of the possible board rejection locations (taken from the 'Factory Board Rejection' action type form) ...
  // ... and the geometry board part numbers (taken from the 'Search for Geometry Boards by Location or Part Number' interface page .pug code) ...
  // ... and an empty array of zeroes, each of which represents a single [location, part number] combination ... i.e. [0] = ['cambridge', '8760051'], [1] = ['cambridge', '8760054'], etc.
  const rejectionLocations = ['cambridge', 'chicago', 'daresbury', 'lancaster', 'manchester', 'sheffield', 'sussex', 'williamAndMary'];
  const boardPartNumbers = [
    '8760051', '8760054', '8760062', '8760113', '8760038', '8760040', '8760042', '8760044', '8760057', '8760059',
    '8760111', '8760024', '8760026', '8760030', '8760036', '8760107', '8760028', '8760032', '8760034', '8760109',
    '8760119', '8760115', '8760123', '8760122', '8760121', '8760120', '8760104', '8760116', '8760108'
  ];

  let rejectionCounts_array = Array(rejectionLocations.length * boardPartNumbers.length).fill(0);

  // For each previously found 'Geometry Board' component ...
  for (const board of records) {
    // Extract the rejection location from the board's 'rejectionDetail' string
    const rejectionLocation_stringValue = board.rejectionDetail.split(' - ')[0].substring(1);
    const rejectionLocation = Object.keys(utils.dictionary_locations).find(key => utils.dictionary_locations[key] === rejectionLocation_stringValue);

    // Find which indices in their respective arrays correspond to the rejection location and the board part number ...
    // ... and from these, determine which index of the 'actionCounts' array this action's [location, part number] combination corresponds to, and increment it by 1
    rejectionCounts_array[(rejectionLocations.indexOf(rejectionLocation) * boardPartNumbers.length) + boardPartNumbers.indexOf(board.partNumber)] += 1;
  }

  // We need the return of this function to be an array of OBJECTS, to match the return of the 'Components.counts_byPartNumberAndLocation()' function ...
  // ... since both function return to the same M2M script, which needs to output both sets of data in a consistent manner
  // Set up a new empty array, and for each [location, part number] combination, create and fill a new object with the appropriate fields and values to match those from the other function
  let actionCounts = [];

  for (const [locationIndex, location] of rejectionLocations.entries()) {
    for (const [partNumberIndex, partNumber] of boardPartNumbers.entries()) {
      actionCounts.push({
        'count': rejectionCounts_array[(locationIndex * boardPartNumbers.length) + partNumberIndex],
        'partNumber': partNumber,
        'location': location,
      })
    }
  }

  // Return the array of objects
  return actionCounts;
}


/// Auto-complete an action ID string as it is being typed
/// This function actually returns a list of action records with matching action IDs to that being typed
async function autoCompleteId(inputString, limit = 10) {
  // Remove any underscores and dashes from the input string
  let q = inputString.replace(/[_-]/g, '');

  // Calculate the minimum and maximum possible hexadecimal values of the input string
  // The action ID is 24 alphanumeric characters long, so the minimum value is given by the input string padded out to this length with '0' characters, and the maximum by padding using 'F' characters
  const bitlow = new ObjectId(q.padEnd(24, '0'));
  const bithigh = new ObjectId(q.padEnd(24, 'F'));

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
  removeImageString,
  retrieve,
  versions,
  list,
  boardRejectionCounts_byPartNumberAndLocation,
  autoCompleteId,
}
