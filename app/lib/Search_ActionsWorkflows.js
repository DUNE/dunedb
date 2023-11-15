const MUUID = require('uuid-mongodb');

const Components = require('./Components');
const { db } = require('./db');


/// Retrieve a list of workflows that involve a particular component, specified by its UUID
async function workflowsByUUID(componentUUID) {
  let aggregation_stages = [];

  // Retrieve all workflows (across all types) that have the same component UUID as the specified one
  // For all workflows, the component UUID will always be set in the 'result' field of the first step in the path
  aggregation_stages.push({
    $match: { 'path.0.result': componentUUID }
  });

  // Select only the latest version of each record
  // First sort the matching records by validity ... highest version first
  // Then group the records by the  workflow ID (i.e. each group contains all versions of the same workflow), and select only the first (highest version number) entry in each group
  // Finally, set which fields in the first record are to be returned for use in subsequent aggregation stages
  aggregation_stages.push({ $sort: { 'validity.version': -1 } });
  aggregation_stages.push({
    $group: {
      _id: { workflowId: '$workflowId' },
      workflowId: { '$first': '$workflowId' },
      typeFormName: { '$first': '$typeFormName' },
      status: { '$first': '$status' },
    },
  });

  // Query the 'workflows' records collection using the aggregation stages defined above
  let results = await db.collection('workflows')
    .aggregate(aggregation_stages)
    .toArray();

  // Return the list of workflows
  return results;
}


/// Retrieve a list of non-conformance actions that have been performed on a specified component type
async function nonConformanceByComponentType(componentType, disposition, status) {
  // Set up 'matching' strings that can be used by MongoDB to match against specific record field values
  // For the disposition and status, if it has been specified, just use it as the matching string ... otherwise use a fully wildcard regular expression
  const dispositionString = (disposition) ? disposition : /(.*?)/;
  const statusString = (status) ? status : /(.*?)/;

  let aggregation_stages = [];

  // Retrieve all 'APA Non-Conformance' action records that match the provided component type and disposition and status matching strings
  aggregation_stages.push({
    $match: {
      'typeFormId': 'APANonConformance',
      'data.componentType': componentType,
      'data.disposition': dispositionString,
      'data.status': statusString,
    }
  });

  // Select only the latest version of each record
  // First sort the matching records by validity ... highest version first
  // Then group the records by the action ID (i.e. each group contains all versions of the same action), and select only the first (highest version number) entry in each group
  // Finally, set which fields in the first record are to be returned for use in subsequent aggregation stages
  aggregation_stages.push({ $sort: { 'validity.version': -1 } });
  aggregation_stages.push({
    $group: {
      _id: { actionId: '$actionId' },
      actionId: { '$first': '$actionId' },
      componentUuid: { '$first': '$componentUuid' },
      title: { '$first': '$data.nonConformanceTitle' },
      componentType: { '$first': '$data.componentType' },
      disposition: { '$first': '$data.disposition' },
      status: { '$first': '$data.status' },
    },
  });

  // Query the 'actions' records collection using the aggregation stages defined above
  let results = await db.collection('actions')
    .aggregate(aggregation_stages)
    .toArray();

  // Return the list of actions
  return results;
}


/// Retrieve a list of non-conformance actions that have been performed on a single component, specified by its UUID
async function nonConformanceByUUID(componentUUID) {
  let aggregation_stages = [];

  // Retrieve all 'APA Non-Conformance' action records that have the same component UUID as the specified one
  aggregation_stages.push({
    $match: {
      'typeFormId': 'APANonConformance',
      'componentUuid': MUUID.from(componentUUID),
    }
  });

  // Select only the latest version of each record
  // First sort the matching records by validity ... highest version first
  // Then group the records by the action ID (i.e. each group contains all versions of the same action), and select only the first (highest version number) entry in each group
  // Finally, set which fields in the first record are to be returned for use in subsequent aggregation stages
  aggregation_stages.push({ $sort: { 'validity.version': -1 } });
  aggregation_stages.push({
    $group: {
      _id: { actionId: '$actionId' },
      actionId: { '$first': '$actionId' },
      componentUuid: { '$first': '$componentUuid' },
      title: { '$first': '$data.nonConformanceTitle' },
      componentType: { '$first': '$data.componentType' },
      disposition: { '$first': '$data.disposition' },
      status: { '$first': '$data.status' },
    },
  });

  // Query the 'actions' records collection using the aggregation stages defined above
  let results = await db.collection('actions')
    .aggregate(aggregation_stages)
    .toArray();

  // Return the list of actions
  return results;
}


/// Retrieve a list of tension measurement actions that have been performed on a single component, specified by its UUID
async function tensionMeasurementsByUUID(componentUUID) {
  let aggregation_stages = [];

  // Retrieve all 'Single Layer Tension Measurements' action records that have the same component UUID as the specified one
  aggregation_stages.push({
    $match: {
      'typeFormId': 'x_tension_testing',
      'componentUuid': MUUID.from(componentUUID),
    }
  });

  // Select only the latest version of each record
  // First sort the matching records by validity ... highest version first
  // Then group the records by the action ID (i.e. each group contains all versions of the same action), and select only the first (highest version number) entry in each group
  // Finally, set which fields in the first record are to be returned for use in subsequent aggregation stages
  aggregation_stages.push({ $sort: { 'validity.version': -1 } });
  aggregation_stages.push({
    $group: {
      _id: { actionId: '$actionId' },
      actionId: { '$first': '$actionId' },
      componentUuid: { '$first': '$componentUuid' },
      apaLayer: { '$first': '$data.apaLayer' },
      location: { '$first': '$data.location' },
      comments: { '$first': '$data.comments' },
    },
  });

  // Query the 'actions' records collection using the aggregation stages defined above
  let results = await db.collection('actions')
    .aggregate(aggregation_stages)
    .toArray();

  // Return the list of actions
  return results;
}


/// Retrieve a list of board installation actions that reference a single component, specified by its UUID
async function boardInstallByReferencedComponent(componentUUID) {
  // Set up a list of type form IDs which correspond to 'board installation' type actions
  let actionTypeFormIDs = [
    'g_foot_board_install', 'g_head_board_install_sideA', 'g_head_board_install_sideB',
    'u_foot_boards_install', 'u_head_board_install_sideA', 'u_head_board_installation_sideB', 'u_side_board_install_HSB', 'u_side_board_install_LSB',
    'v_foot_board_install', 'v_head_board_install_sideA', 'v_head_board_install_sideB', 'v_side_board_install_HSB', 'v_side_board_install_LSB',
    'x_foot_board_install', 'x_head_board_install_sideA', 'x_head_board_install_sideB',
  ];

  let aggregation_stages = [];

  // Retrieve all board installation type action records
  aggregation_stages.push({
    $match: {
      'typeFormId': { $in: actionTypeFormIDs },
    }
  });

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
      componentUuid: { '$first': '$componentUuid' },
      data: { '$first': '$data' },
    },
  });

  // Query the 'actions' records collection using the aggregation stages defined above
  let results = await db.collection('actions')
    .aggregate(aggregation_stages)
    .toArray();


  // At this stage we have a list of all 'Board Installation' action records
  // But we want to narrow this down to only those records which contain the specified component UUID in one of the 'data.boardXUuid' key/value pairs, where X = 1 -> 10 or 21
  // Loop over the keys in each record's 'data' object, and if the value matches the specified UUID, save the record into a list
  let boardInstalls = [];

  if (results.length > 0) {
    for (const action of results) {
      for (const [key, value] of Object.entries(action.data)) {
        if (value === componentUUID) boardInstalls.push(action);
      }
    }
  }

  // Add the corresponding component name to each matching record, adjusting it depending on component type for easier readability (shorten DUNE PIDs, and use UKIDs for geometry boards)
  for (let record of boardInstalls) {
    const component = await Components.retrieve(MUUID.from(record.componentUuid).toString());

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

  // Return the list of matching actions
  return boardInstalls;
}


module.exports = {
  workflowsByUUID,
  nonConformanceByComponentType,
  nonConformanceByUUID,
  tensionMeasurementsByUUID,
  boardInstallByReferencedComponent,
}
