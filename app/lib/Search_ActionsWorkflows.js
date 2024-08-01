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

  // Add the component name to each matching record ... this needs to be retrieved from the component's own record, since it is not stored in the action record
  for (let result of results) {
    const component = await Components.retrieve(MUUID.from(result.componentUuid).toString());
    result.componentName = component.data.name;
  }

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

  // Add the component name to each matching record ... this needs to be retrieved from the component's own record, since it is not stored in the action record
  for (let result of results) {
    const component = await Components.retrieve(MUUID.from(result.componentUuid).toString());
    result.componentName = component.data.name;
  }

  // Return the list of actions
  return results;
}


/// Retrieve a list of board installation actions that reference a single component, specified by its UUID
async function boardInstallByReferencedComponent(componentUUID) {
  // Set up a list of type form IDs which correspond to 'board installation' type actions
  const actionTypeFormIDs = [
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

  // Add the corresponding shortened Assembled APA component name to each matching record
  for (let record of boardInstalls) {
    const component = await Components.retrieve(MUUID.from(record.componentUuid).toString());
    const name_splits = component.data.name.split('-');
    record.componentName = `${name_splits[1]}-${name_splits[2]}`.slice(0, -3);
  }

  // Return the list of matching actions
  return boardInstalls;
}


/// Retrieve a list of winding actions that reference a single component, specified by its UUID
async function windingByReferencedComponent(componentUUID) {
  // Set up a list of type form IDs which correspond to 'winding' type actions
  const actionTypeFormIDs = [
    'g_winding', 'u_winding', 'v_winding', 'x_winding',
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


  // At this stage we have a list of all 'Winding' action records
  // But we want to narrow this down to only those records which contain the specified component UUID in one of the 'data.bobbinGrid[X].bobbinUuid' key/value pairs, where X >= 0
  // Loop over the keys in each record's 'data' object, and if the value matches the specified UUID, save the record into a list
  let windings = [];

  if (results.length > 0) {
    for (const action of results) {
      for (const bobbin of action.data.bobbinGrid) {
        if (bobbin.bobbinUuid === componentUUID) windings.push(action);
      }
    }
  }

  // Add the corresponding shortened Assembled APA component name to each matching record
  for (let record of windings) {
    const component = await Components.retrieve(MUUID.from(record.componentUuid).toString());
    const name_splits = component.data.name.split('-');
    record.componentName = `${name_splits[1]}-${name_splits[2]}`.slice(0, -3);
  }

  // Return the list of matching actions
  return windings;
}


/// Retrieve wire tension measurements that have been performed on a specified wire layer of a specified Assembled APA at two specified locations
async function tensionComparisonAcrossLocations(componentUUID, wireLayer, origin, destination) {
  let aggregation_stages = [];

  // Retrieve all 'Single Layer Tension Measurements' action records that have the same component UUID, wire layer and location as the specified ones
  aggregation_stages.push({
    $match: {
      'typeFormId': 'x_tension_testing',
      'componentUuid': MUUID.from(componentUUID),
      'data.apaLayer': wireLayer,
      'data.location': { $in: [origin, destination] }
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
      location: { '$first': '$data.location' },
      tensions_sideA: { '$first': '$data.measuredTensions_sideA' },
      tensions_sideB: { '$first': '$data.measuredTensions_sideB' },
    },
  });

  // Query the 'actions' records collection using the aggregation stages defined above
  let results = await db.collection('actions')
    .aggregate(aggregation_stages)
    .toArray();

  // Set up an object to be returned ... once completed, this will contain the raw measured tensions on both sides at both locations, as well as the differences between the tensions across locations
  let tensions = {
    origin_actionId: null,
    origin_sideA: null,
    origin_sideB: null,
    destination_actionId: null,
    destination_sideA: null,
    destination_sideB: null,
    differences_sideA: [],
    differences_sideB: [],
  }

  // Set the various object entries using the appropriate tension measurements (making sure to check that the measurements actually exist along the way)
  for (const result of results) {
    if (result.location === origin) {
      tensions.origin_actionId = result.actionId;

      if (result.tensions_sideA) tensions.origin_sideA = [...result.tensions_sideA];
      if (result.tensions_sideB) tensions.origin_sideB = [...result.tensions_sideB];
    } else if (result.location === destination) {
      tensions.destination_actionId = result.actionId;

      if (result.tensions_sideA) tensions.destination_sideA = [...result.tensions_sideA];
      if (result.tensions_sideB) tensions.destination_sideB = [...result.tensions_sideB];
    }
  }

  if ((tensions.origin_sideA) && (tensions.destination_sideA) && (tensions.origin_sideA.length === tensions.destination_sideA.length)) {
    for (let t = 0; t < tensions.origin_sideA.length; t++) {
      tensions.differences_sideA.push(tensions.destination_sideA[t] - tensions.origin_sideA[t]);
    }
  }

  if ((tensions.origin_sideB) && (tensions.destination_sideB) && (tensions.origin_sideB.length === tensions.destination_sideB.length)) {
    for (let t = 0; t < tensions.origin_sideB.length; t++) {
      tensions.differences_sideB.push(tensions.destination_sideB[t] - tensions.origin_sideB[t]);
    }
  }

  // Return the object
  return tensions;
}


module.exports = {
  workflowsByUUID,
  nonConformanceByComponentType,
  nonConformanceByUUID,
  boardInstallByReferencedComponent,
  windingByReferencedComponent,
  tensionComparisonAcrossLocations,
}
