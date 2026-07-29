const MUUID = require('uuid-mongodb');

const { db } = require('./db');

const dictionary_apaNCRs_types = {
  damagedWireSegment: 'Damaged Wire Segment',
  missingWireSegment: 'Missing Wire Segment',
  misplacedWireSegment: 'Misplaced Wire Segment',
  shortedWireSegment: 'Shorted Wire Segment',
  combIssue: 'Comb Issue',
  conduitIssue: 'Conduit Issue',
  geometryBoardIssue: 'Geometry Board Issue',
  incorrectFasteners: 'Fastener Issue',
  frameIssue: 'Issue with the Frame',
  meshIssue: 'Issue with Mesh Panel',
  machiningIssue: 'Machining Issue',
  protectionKit: 'Protection Kit',
  pdCables: 'PD Cables',
  temperatureCables: 'Temperature Cables',
  other: 'Other',
};

const dictionary_meshPanelNCRs_types = {
  holesInMesh: 'Holes in mesh',
  frameIssue: 'Frame issue',
  meshNotTight: 'Mesh not tight',
};


/// Retrieve a list of workflows that involve a particular component, specified by its UUID
async function workflowsByUUID(componentUUID) {
  let aggregation_stages = [];

  // Match against the component UUID to get records of all workflows that have the same associated component as the specified one
  // The component UUID will always be set in the 'result' field of the first step in the workflow path
  aggregation_stages.push({
    $match: { 'path.0.result': componentUUID }
  });

  // Select the latest version of each record, and pass through only the fields required for later use
  aggregation_stages.push({ $sort: { 'recordVersion': -1 } });
  aggregation_stages.push({
    $group: {
      _id: { workflowId: '$workflowId' },
      workflowId: { '$first': '$workflowId' },
      completionStatus: { '$first': '$completionStatus' },
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
  let aggregation_stages = [];

  // Match against the type form ID to get records of all NCRs applying to all types of components
  aggregation_stages.push({
    $match: {
      'typeFormId': 'APANonConformance',
    }
  });

  // Select the latest version of each record, and pass through only the fields required for later use
  // Then sort the records reverse alphabetically by the 'componentName' field
  aggregation_stages.push({ $sort: { 'recordVersion': -1 } });
  aggregation_stages.push({
    $group: {
      _id: { actionId: '$actionId' },
      actionId: { '$first': '$actionId' },
      componentUuid: { '$first': '$componentUuid' },
      componentName: { '$first': '$componentName' },
      title: { '$first': '$data.nonConformanceTitle' },
      componentType: { '$first': '$data.componentType' },
      nonConfTypes_apas: { '$first': '$data.nonConformanceType' },
      nonConfTypes_meshes: { '$first': '$data.frameNonConformanceType1' },
      disposition: { '$first': '$data.disposition' },
      status: { '$first': '$data.status' },
    },
  });

  aggregation_stages.push({ $sort: { 'componentName': -1 } });

  // Match against the specified component type, disposition and status
  // For the disposition and status, set up 'matching' strings that can be used by MongoDB to match against specific record field values, and then match against them
  // If either parameter has been provided as something other than 'any', just match against the provided string ... otherwise use a fully wildcard regular expression
  const dispositionString = (disposition !== 'any') ? disposition : /(.*?)/;
  const statusString = (status !== 'any') ? status : /(.*?)/;

  aggregation_stages.push({
    $match: {
      'componentType': componentType,
      'disposition': dispositionString,
      'status': statusString,
    }
  });

  // Query the 'actions' records collection using the aggregation stages defined above
  let results = await db.collection('actions')
    .aggregate(aggregation_stages)
    .toArray();

  // Add the corresponding component name to each matching record
  // Additionally, get the first 'true' non-conformance type in each record, convert it to something more readable and save this new string to the record
  for (let result of results) {
    if (result.componentType === 'assembledApa') {
      if (result.nonConfTypes_apas != null) {
        result.nonConfType = dictionary_apaNCRs_types[Object.keys(result.nonConfTypes_apas).filter(k => result.nonConfTypes_apas[k])[0]];
      } else {
        result.nonConfType = '[No NC Type Found!]';
      }
    } else {
      if (result.nonConfTypes_meshes != null) {
        result.nonConfType = dictionary_meshPanelNCRs_types[Object.keys(result.nonConfTypes_meshes).filter(k => result.nonConfTypes_meshes[k])[0]];
      } else {
        result.nonConfType = '[No NC Type Found!]';
      }
    }
  }

  // Return the list of matching actions
  return results;
}


/// Retrieve a list of non-conformance actions that have been performed on a single component, specified by its UUID
async function nonConformanceByUUID(componentUUID) {
  let aggregation_stages = [];

  // Match against the type form ID and component UUID to get records of all NCR actions performed on the specified component
  aggregation_stages.push({
    $match: {
      'typeFormId': 'APANonConformance',
      'componentUuid': MUUID.from(componentUUID),
    }
  });

  // Select the latest version of each record, and pass through only the fields required for later use
  // Then sort the records reverse alphabetically by the 'actionId' field
  aggregation_stages.push({ $sort: { 'recordVersion': -1 } });
  aggregation_stages.push({
    $group: {
      _id: { actionId: '$actionId' },
      actionId: { '$first': '$actionId' },
      componentUuid: { '$first': '$componentUuid' },
      componentName: { '$first': '$componentName' },
      title: { '$first': '$data.nonConformanceTitle' },
      componentType: { '$first': '$data.componentType' },
      nonConfTypes_apas: { '$first': '$data.nonConformanceType' },
      nonConfTypes_meshes: { '$first': '$data.frameNonConformanceType1' },
      disposition: { '$first': '$data.disposition' },
      status: { '$first': '$data.status' },
    },
  });

  aggregation_stages.push({ $sort: { 'actionId': -1 } });

  // Query the 'actions' records collection using the aggregation stages defined above
  let results = await db.collection('actions')
    .aggregate(aggregation_stages)
    .toArray();

  // Add the corresponding component name to each matching record
  // Additionally, get the first 'true' non-conformance type in each record, convert it to something more readable and save this new string to the record
  for (let result of results) {
    if (result.componentType === 'assembledApa') {
      if (result.nonConfTypes_apas != null) {
        result.nonConfType = dictionary_apaNCRs_types[Object.keys(result.nonConfTypes_apas).filter(k => result.nonConfTypes_apas[k])[0]];
      } else {
        result.nonConfType = '[No NC Type Found!]';
      }
    } else {
      if (result.nonConfTypes_meshes != null) {
        result.nonConfType = dictionary_meshPanelNCRs_types[Object.keys(result.nonConfTypes_meshes).filter(k => result.nonConfTypes_meshes[k])[0]];
      } else {
        result.nonConfType = '[No NC Type Found!]';
      }
    }
  }

  // Return the list of matching actions
  return results;
}


/// Retrieve a list of board installation actions that reference a single component, specified by its UUID
async function boardInstallByReferencedComponent(componentUUID) {
  let aggregation_stages = [];

  // Match against the type form ID to get records of all 'Board Installation' actions
  aggregation_stages.push({
    $match: {
      'typeFormId': { $in: ['x_boards', 'v_boards', 'u_boards', 'g_boards'] },
    }
  });

  // Select the latest version of each record, and pass through only the fields required for later use
  aggregation_stages.push({ $sort: { 'recordVersion': -1 } });
  aggregation_stages.push({
    $group: {
      _id: { actionId: '$actionId' },
      actionId: { '$first': '$actionId' },
      typeFormName: { '$first': '$typeFormName' },
      componentUuid: { '$first': '$componentUuid' },
      componentName: { '$first': '$componentName' },
      data: { '$first': '$data' },
    },
  });

  // Query the 'actions' records collection using the aggregation stages defined above
  let results = await db.collection('actions')
    .aggregate(aggregation_stages)
    .toArray();


  // At this point, we have a list of all 'Board Installation' action records
  // But we want to narrow this down to only those records which contain the specified component UUID in one of the arrays of board UUIDs in the 'data' object ...
  // ... where the arrays are named: 'headBoardsA', 'headBoardsB', 'footBoards', 'sideBoardsHSB', 'sideBoardsLSB' (the latter two being present only in V and U layer board installation actions)
  // Loop over the entries in each possible array, and if the entry's UUID matches the specified one, save the record into a list to be returned
  let boardInstalls = [];

  if (results.length > 0) {
    for (const action of results) {
      for (const board of action.data.headBoardsA) {
        if (board.boardUuid === componentUUID) boardInstalls.push(action);
      }

      for (const board of action.data.headBoardsB) {
        if (board.boardUuid === componentUUID) boardInstalls.push(action);
      }

      for (const board of action.data.footBoards) {
        if (board.boardUuid === componentUUID) boardInstalls.push(action);
      }

      if (action.data.sideBoardsHSB) {
        for (const board of action.data.sideBoardsHSB) {
          if (board.boardUuid === componentUUID) boardInstalls.push(action);
        }

        for (const board of action.data.sideBoardsLSB) {
          if (board.boardUuid === componentUUID) boardInstalls.push(action);
        }
      }
    }
  }

  // Return the list of matching actions
  return boardInstalls;
}


/// Retrieve a list of winding actions that reference a single component, specified by its UUID
async function windingByReferencedComponent(componentUUID) {
  let aggregation_stages = [];

  // Match against the type form ID to get records of all 'Winding' actions
  aggregation_stages.push({
    $match: {
      'typeFormId': { $in: ['g_winding', 'u_winding', 'v_winding', 'x_winding'] },
    }
  });

  // Select the latest version of each record, and pass through only the fields required for later use
  aggregation_stages.push({ $sort: { 'recordVersion': -1 } });
  aggregation_stages.push({
    $group: {
      _id: { actionId: '$actionId' },
      actionId: { '$first': '$actionId' },
      typeFormName: { '$first': '$typeFormName' },
      componentUuid: { '$first': '$componentUuid' },
      componentName: { '$first': '$componentName' },
      data: { '$first': '$data' },
    },
  });

  // Query the 'actions' records collection using the aggregation stages defined above
  let results = await db.collection('actions')
    .aggregate(aggregation_stages)
    .toArray();

  // At this point, we have a list of all 'Winding' action records
  // But we want to narrow this down to only those records which contain the specified component UUID in one of the 'data.bobbinGrid[X].bobbinUuid' key/value pairs, where X >= 0
  // Loop over the keys in each record's 'data' object, and if the value matches the specified UUID, save the record into a list to be returned
  let windings = [];

  if (results.length > 0) {
    for (const action of results) {
      for (const bobbin of action.data.bobbinGrid) {
        if (bobbin.bobbinUuid === componentUUID) windings.push(action);
      }
    }
  }

  // Return the list of matching actions
  return windings;
}


/// Retrieve a list of board rejection actions that reference a single component, specified by its UUID
async function boardRejectionByReferencedComponent(componentUUID) {
  let aggregation_stages = [];

  // Match against the type form ID and component UUID to get records of all 'Factory Board Rejection'actions performed on the specified component
  aggregation_stages.push({
    $match: {
      'typeFormId': 'FactoryBoardRejection',
      'componentUuid': MUUID.from(componentUUID),
    }
  });

  // Select the latest version of each record, and pass through only the fields required for later use
  aggregation_stages.push({ $sort: { 'recordVersion': -1 } });
  aggregation_stages.push({
    $group: {
      _id: { actionId: '$actionId' },
      actionId: { '$first': '$actionId' },
      typeFormName: { '$first': '$typeFormName' },
      componentUuid: { '$first': '$componentUuid' },
      componentName: { '$first': '$componentName' },
      data: { '$first': '$data' },
    },
  });

  // Query the 'actions' records collection using the aggregation stages defined above
  let results = await db.collection('actions')
    .aggregate(aggregation_stages)
    .toArray();

  // Return the list of matching actions
  return results;
}


/// Retrieve wire tension measurements that have been performed on a specified wire layer of a specified Assembled APA at two specified locations
async function tensionComparisonAcrossLocations(componentUUID, wireLayer, origin, destination) {
  let aggregation_stages = [];

  // Match against the type form ID, component UUID, APA layer and location to get records of all 'Single Layer Tension Measurement' actions performed on the given [APA, layer] combination at the given locations
  aggregation_stages.push({
    $match: {
      'typeFormId': 'x_tension_testing',
      'componentUuid': MUUID.from(componentUUID),
      'data.apaLayer': wireLayer,
      'data.location': { $in: [origin, destination] }
    }
  });

  // Select the latest version of each record, and pass through only the fields required for later use
  aggregation_stages.push({ $sort: { 'recordVersion': -1 } });
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

  // Set up an object to be returned ... once populated, this will contain the raw measured tensions on both sides at both locations, as well as the differences between the tensions across locations
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
  boardRejectionByReferencedComponent,
  tensionComparisonAcrossLocations,
}
