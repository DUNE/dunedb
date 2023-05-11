const MUUID = require('uuid-mongodb');

const Components = require('./Components');
const { db } = require('./db');


/// Retrieve collated information about a single assembled APA (and associated components and actions) that will be displayed in its executive summary
async function collateInfo(componentUUID) {
  // Set up an empty dictionary to store the collated information ... it will be saved as [key, value] pairs for easier access on the executive summary interface page
  let collatedInfo = {};

  // Get information about the temperature sensors on the Assembled APA
  let aggregation_stages = [];
  let results = [];

  aggregation_stages.push({
    $match: {
      'typeFormId': 'pd_cable_temp_sensor_install',
      'componentUuid': MUUID.from(componentUUID),
    }
  });

  aggregation_stages.push({ $sort: { 'validity.version': -1 } });
  aggregation_stages.push({
    $group: {
      _id: { actionId: '$actionId' },
      data: { '$first': '$data' },
    },
  });

  results = await db.collection('actions')
    .aggregate(aggregation_stages)
    .toArray();

  if (results.length > 0) {
    collatedInfo.tempSensors_config = results[0].data.configuration;
    collatedInfo.tempSensors_serials = [results[0].data.tempSensorSerialNumber, results[0].data.tempSensorSerialNumber1, results[0].data.tempSensorSerialNumber2, results[0].data.tempSensorSerialNumber3];
  } else {
    collatedInfo.tempSensors_config = 'none';
    collatedInfo.tempSensors_serials = ['none', 'none', 'none', 'none'];
  }

  // Get information about any wire related non-conformances on the Assembled APA
  aggregation_stages = [];
  results = [];

  aggregation_stages.push({
    $match: {
      'typeFormId': 'APANonConformance',
      'componentUuid': MUUID.from(componentUUID),
      $or: [{
        'data.nonConformanceType.missingWireSegment': true
      }, {
        'data.nonConformanceType.misplacedWireSegment': true
      }],
    }
  });

  aggregation_stages.push({ $sort: { 'validity.version': -1 } });
  aggregation_stages.push({
    $group: {
      _id: { actionId: '$actionId' },
      actionId: { '$first': '$actionId' },
      wireData: { '$first': '$data.dataGrid' },
    },
  });

  results = await db.collection('actions')
    .aggregate(aggregation_stages)
    .toArray();

  collatedInfo.wireNonConformances = [];

  if (results.length > 0) {
    for (const result of results) {
      for (const entry of result.wireData) {
        dictionary = {
          layerSide: entry.wireLayer.toUpperCase(),
          boardPad: entry.headBoardAndPad,
          channel: entry.coldElectronicsChannel,
          actionId: result.actionId,
        }

        collatedInfo.wireNonConformances.push(dictionary);
      }
    }
  }

  // Get information about any non-wire related non-conformances on the Assembled APA
  aggregation_stages = [];
  results = [];

  aggregation_stages.push({
    $match: {
      'typeFormId': 'APANonConformance',
      'componentUuid': MUUID.from(componentUUID),
      'data.nonConformanceType.missingWireSegment': false,
      'data.nonConformanceType.misplacedWireSegment': false,
    }
  });

  aggregation_stages.push({ $sort: { 'validity.version': -1 } });
  aggregation_stages.push({
    $group: {
      _id: { actionId: '$actionId' },
      actionId: { '$first': '$actionId' },
      nonConf_type: { '$first': '$data.nonConformanceType' },
      nonConf_description: { '$first': '$data.nonConformanceDescription' },
    },
  });

  results = await db.collection('actions')
    .aggregate(aggregation_stages)
    .toArray();

  dictionary_apaNonConformanceIssues = {
    geometryBoardIssue: 'Geometry Board Issue',
    combIssue: 'Comb Issue',
    machiningIssue: 'Machining Issue',
    conduitIssue: 'Conduit Issue',
    incorrectFasteners: 'Incorrect Fasteners',
  };

  collatedInfo.otherNonConformances = [];

  if (results.length > 0) {
    for (const result of results) {
      let nonConfType = '';

      for (const [key, value] of Object.entries(result.nonConf_type)) {
        if (value) nonConfType = key;
      }

      dictionary = {
        component: 'Assembled APA',
        type: dictionary_apaNonConformanceIssues[nonConfType],
        description: result.nonConf_description,
        actionId: result.actionId,
      }

      collatedInfo.otherNonConformances.push(dictionary);
    }
  }

  // Get information about any non-conformances on the APA frame ...
  // ... first retrieve the full component record of the Assembled APA, which contains the UUID of the frame ...
  // ... and then retrieve any non-conformance reports that contain the frame UUID
  const assembledAPA = await Components.retrieve(componentUUID);

  aggregation_stages = [];
  results = [];

  aggregation_stages.push({
    $match: {
      'typeFormId': 'APANonConformance',
      'componentUuid': MUUID.from(assembledAPA.data.frameUuid),
    }
  });

  aggregation_stages.push({ $sort: { 'validity.version': -1 } });
  aggregation_stages.push({
    $group: {
      _id: { actionId: '$actionId' },
      actionId: { '$first': '$actionId' },
      nonConf_type: { '$first': '$data.frameNonConformanceType' },
      nonConf_description: { '$first': '$data.nonConformanceDescription' },
    },
  });

  results = await db.collection('actions')
    .aggregate(aggregation_stages)
    .toArray();

  dictionary_frameNonConformanceIssues = {
    machiningIssue: 'Machining Issue',
    bow: 'Bow',
    twist: 'Twist',
    survey: 'Survey',
  };

  collatedInfo.frameNonConformances = [];

  if (results.length > 0) {
    for (const result of results) {
      let nonConfType = '';

      for (const [key, value] of Object.entries(result.nonConf_type)) {
        if (value) nonConfType = key;
      }

      dictionary = {
        component: 'APA Frame',
        type: dictionary_frameNonConformanceIssues[nonConfType],
        description: result.nonConf_description,
        actionId: result.actionId,
      }

      collatedInfo.frameNonConformances.push(dictionary);
    }
  }

  // Get information about any non-conformances on the grounding meshes ...
  // ... first retrieve the most recent 'mesh installation' action record performed on the assembled APA, and from that a list of the mesh UUIDs ...
  // ... then retrieve any non-conformance reports that contain any of the mesh UUIDs
  aggregation_stages = [];
  results = [];

  aggregation_stages.push({
    $match: {
      'typeFormId': 'prep_mesh_panel_install',
      'componentUuid': MUUID.from(componentUUID),
    }
  });

  aggregation_stages.push({ $sort: { 'validity.version': -1 } });
  aggregation_stages.push({
    $group: {
      _id: { actionId: '$actionId' },
      actionId: { '$first': '$actionId' },
      data: { '$first': '$data' },
    },
  });

  results = await db.collection('actions')
    .aggregate(aggregation_stages)
    .toArray();

  let meshUUIDs = null;

  if (results.length > 0) {
    meshUUIDs = [
      MUUID.from(results[0].data.sideAMeshPanel1Uuid), MUUID.from(results[0].data.sideBMeshPanel1Uuid),
      MUUID.from(results[0].data.sideAMeshPanel2Uuid), MUUID.from(results[0].data.sideBMeshPanel2Uuid),
      MUUID.from(results[0].data.sideAMeshPanel3Uuid), MUUID.from(results[0].data.sideBMeshPanel3Uuid),
      MUUID.from(results[0].data.sideAMeshPanel4Uuid), MUUID.from(results[0].data.sideBMeshPanel4Uuid),
      MUUID.from(results[0].data.sideAMeshPanel5Uuid), MUUID.from(results[0].data.sideBMeshPanel5Uuid),
      MUUID.from(results[0].data.sideAMeshPanel6Uuid), MUUID.from(results[0].data.sideBMeshPanel6Uuid),
      MUUID.from(results[0].data.sideAMeshPanel7Uuid), MUUID.from(results[0].data.sideBMeshPanel7Uuid),
      MUUID.from(results[0].data.sideAMeshPanel8Uuid), MUUID.from(results[0].data.sideBMeshPanel8Uuid),
      MUUID.from(results[0].data.sideAMeshPanel9Uuid), MUUID.from(results[0].data.sideBMeshPanel9Uuid),
      MUUID.from(results[0].data.sideAMeshPanel10Uuid), MUUID.from(results[0].data.sideBMeshPanel10Uuid),
    ]
  };

  aggregation_stages = [];
  results = [];

  aggregation_stages.push({
    $match: {
      'typeFormId': 'APANonConformance',
      'componentUuid': { $in: meshUUIDs }
    }
  });

  aggregation_stages.push({ $sort: { 'validity.version': -1 } });
  aggregation_stages.push({
    $group: {
      _id: { actionId: '$actionId' },
      actionId: { '$first': '$actionId' },
      nonConf_type: { '$first': '$data.frameNonConformanceType1' },
      nonConf_description: { '$first': '$data.nonConformanceDescription' },
    },
  });

  results = await db.collection('actions')
    .aggregate(aggregation_stages)
    .toArray();

  dictionary_meshNonConformanceIssues = {
    holesInMesh: 'Holes in mesh',
    frameIssue: 'Frame issue',
    meshNotTight: 'Mesh not tight',
  };

  collatedInfo.meshNonConformances = [];

  if (results.length > 0) {
    for (const result of results) {
      let nonConfType = '';

      for (const [key, value] of Object.entries(result.nonConf_type)) {
        if (value) nonConfType = key;
      }

      dictionary = {
        component: 'Grounding Mesh',
        type: dictionary_meshNonConformanceIssues[nonConfType],
        description: result.nonConf_description,
        actionId: result.actionId,
      }

      collatedInfo.meshNonConformances.push(dictionary);
    }
  }

  // Return the completed dictionary of collated information
  return collatedInfo;
}


module.exports = {
  collateInfo,
}
