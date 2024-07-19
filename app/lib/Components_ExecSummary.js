const MUUID = require('uuid-mongodb');

const Actions = require('./Actions');
const Components = require('./Components');
const { db } = require('./db');
const Search_ActionsWorkflows = require('./Search_ActionsWorkflows');
const Workflows = require('./Workflows');
const utils = require('./utils');


/// Retrieve collated information about a single assembled APA (and associated components and actions) that will be displayed in its executive summary
async function collateInfo(componentUUID) {
  // Set up an empty dictionary to store the collated information ... it will be saved as [key, value] pairs for easier access on the interface page
  let collatedInfo = {};
  let aggregation_stages = [];
  let results = [];

  // Get the component record of the assembled APA, and the UUID of the underlying APA frame
  const assembledAPA = await Components.retrieve(componentUUID);
  const frameUUID = assembledAPA.data.frameUuid;

  // Add relevant information from the APA's component record to the collated information
  collatedInfo.apaInfo = {
    dunePID: '',
    productionSite: '',
    configuration: '',
    assemblyStatus: 'none',
    workflowID: '',
  };

  const dictionary_productionSites = {
    chicago: 'Chicago',
    daresbury: 'Daresbury',
    wisconsin: 'Wisconsin',
  };

  const dictionary_configuration = {
    top: 'Top',
    bottom: 'Bottom',
  };

  collatedInfo.apaInfo.dunePID = assembledAPA.data.name;
  collatedInfo.apaInfo.productionSite = dictionary_productionSites[assembledAPA.data.apaAssemblyLocation];
  collatedInfo.apaInfo.configuration = dictionary_configuration[assembledAPA.data.apaConfiguration];

  // Get a list of workflows that involve the assembled APA, specified by its UUID (there should only be one), and add relevant information about the workflow to the collated information
  const workflows = await Search_ActionsWorkflows.workflowsByUUID(componentUUID);

  if (workflows.length === 1) {
    let numberOfCompleteActions = 0;
    const workflow = await Workflows.retrieve(workflows[0].workflowId);

    for (let stepIndex = 1; stepIndex < workflow.path.length; stepIndex++) {
      if (workflow.path[stepIndex].result.length > 0) {
        const action = await Actions.retrieve(workflow.path[stepIndex].result);

        if (action.data.actionComplete) numberOfCompleteActions++;
      }
    }

    collatedInfo.apaInfo.assemblyStatus = (numberOfCompleteActions === workflow.path.length - 1) ? 'Complete' : 'In Progress';
    collatedInfo.apaInfo.workflowID = workflow.workflowId;
  }

  // Get information about the assembled APA QC
  collatedInfo.apaQC = {
    signoff: '[no information found]',
    actionId: '',
  };

  aggregation_stages = [];
  results = [];

  aggregation_stages.push({
    $match: {
      'typeFormId': 'CompletedAPAQCChecklist',
      'componentUuid': MUUID.from(componentUUID),
    }
  });

  aggregation_stages.push({ $sort: { 'validity.version': -1 } });
  aggregation_stages.push({
    $group: {
      _id: { actionId: '$actionId' },
      signoff: { '$first': '$data.personSigningOff' },
      actionId: { '$first': '$actionId' },
    },
  });

  results = await db.collection('actions')
    .aggregate(aggregation_stages)
    .toArray();

  if (results.length > 0) {
    collatedInfo.apaQC.signoff = utils.dictionary_apaFactoryLeads[results[0].signoff];
    collatedInfo.apaQC.actionId = results[0].actionId;
  }

  // Get information about the APA frame QC
  collatedInfo.frameQC = {
    signoff: '[no information found]',
    qcActionId: '',
    intakeSurveysActionId: '',
    installSurveysActionId: '',
  };

  aggregation_stages = [];
  results = [];

  aggregation_stages.push({
    $match: {
      'typeFormId': 'CompletedFrameQCChecklist',
      'componentUuid': MUUID.from(frameUUID),
    }
  });

  aggregation_stages.push({ $sort: { 'validity.version': -1 } });
  aggregation_stages.push({
    $group: {
      _id: { actionId: '$actionId' },
      signoff: { '$first': '$data.personSigningOff' },
      actionId: { '$first': '$actionId' },
    },
  });

  results = await db.collection('actions')
    .aggregate(aggregation_stages)
    .toArray();

  if (results.length > 0) {
    collatedInfo.frameQC.signoff = utils.dictionary_frameIntakeSignoff[results[0].signoff];
    collatedInfo.frameQC.qcActionId = results[0].actionId;
  }

  // Get information about the APA frame's intake and installation survey actions
  aggregation_stages = [];
  results = [];

  aggregation_stages.push({
    $match: {
      'typeFormId': 'IntakeSurveys',
      'componentUuid': MUUID.from(frameUUID),
    }
  });

  aggregation_stages.push({ $sort: { 'validity.version': -1 } });
  aggregation_stages.push({
    $group: {
      _id: { actionId: '$actionId' },
      actionId: { '$first': '$actionId' },
    },
  });

  results = await db.collection('actions')
    .aggregate(aggregation_stages)
    .toArray();

  if (results.length > 0) {
    collatedInfo.frameQC.intakeSurveysActionId = results[0].actionId;
  }

  aggregation_stages = [];
  results = [];

  aggregation_stages.push({
    $match: {
      'typeFormId': 'InstallationSurveys',
      'componentUuid': MUUID.from(frameUUID),
    }
  });

  aggregation_stages.push({ $sort: { 'validity.version': -1 } });
  aggregation_stages.push({
    $group: {
      _id: { actionId: '$actionId' },
      actionId: { '$first': '$actionId' },
    },
  });

  results = await db.collection('actions')
    .aggregate(aggregation_stages)
    .toArray();

  if (results.length > 0) {
    collatedInfo.frameQC.installSurveysActionId = results[0].actionId;
  }

  // Get information about the mesh panel installation QC
  collatedInfo.meshPanelQC = {
    signoff: '[no information found]',
    actionId: '',
  };

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
      signoff: { '$first': '$data.meshPanelQCBy' },
      actionId: { '$first': '$actionId' },
    },
  });

  results = await db.collection('actions')
    .aggregate(aggregation_stages)
    .toArray();

  if (results.length > 0) {
    collatedInfo.meshPanelQC.signoff = utils.dictionary_technicians[results[0].signoff];
    collatedInfo.meshPanelQC.actionId = results[0].actionId;
  }

  // Get information about the cable conduit insertion QC
  collatedInfo.cableConduitQC = {
    signoff: '[no information found]',
    actionId: '',
  };

  aggregation_stages = [];
  results = [];

  aggregation_stages.push({
    $match: {
      'typeFormId': 'CableConduitInsertion',
      'componentUuid': MUUID.from(componentUUID),
    }
  });

  aggregation_stages.push({ $sort: { 'validity.version': -1 } });
  aggregation_stages.push({
    $group: {
      _id: { actionId: '$actionId' },
      signoff: { '$first': '$data.personVerifyingQC' },
      actionId: { '$first': '$actionId' },
    },
  });

  results = await db.collection('actions')
    .aggregate(aggregation_stages)
    .toArray();

  if (results.length > 0) {
    collatedInfo.cableConduitQC.signoff = results[0].signoff;
    collatedInfo.cableConduitQC.actionId = results[0].actionId;
  }

  // Get information about the photon detector cable and temperature sensor installation QC
  collatedInfo.pdCableTempSensorQC = {
    photonDetectorSignoff: '[no information found]',
    rdInstallationSignoff: '[no information found]',
    actionId: '',
  };

  aggregation_stages = [];
  results = [];

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
      photonDetectorSignoff: { '$first': '$data.pdCablesCheckedBy' },
      rdInstallationSignoff: { '$first': '$data.rtdInstallationCheckedBy' },
      actionId: { '$first': '$actionId' },
    },
  });

  results = await db.collection('actions')
    .aggregate(aggregation_stages)
    .toArray();

  if (results.length > 0) {
    collatedInfo.pdCableTempSensorQC.photonDetectorSignoff = utils.dictionary_technicians[results[0].photonDetectorSignoff];
    collatedInfo.pdCableTempSensorQC.rdInstallationSignoff = utils.dictionary_technicians[results[0].rdInstallationSignoff];
    collatedInfo.pdCableTempSensorQC.actionId = results[0].actionId;
  }

  // For each wire layer ...
  const typeForms_winding = ['g_winding', 'u_winding', 'v_winding', 'x_winding'];
  const typeForms_soldering = ['g_solder', 'u_solder', 'v_solder', 'x_solder'];
  const layers = ['g', 'u', 'v', 'x'];
  const dictionaries = ['layer_g', 'layer_u', 'layer_v', 'layer_x'];

  const dictionary_winders = {
    ukWinder1: 'UK Winder 1',
    ukWinder2: 'UK Winder 2',
    ukWinder3: 'UK Winder 3',
    ukWinder4: 'UK Winder 4',
    ukWinder5: 'UK Winder 5',
    usWinder1: 'US Winder 1',
  };

  const dictionary_heads = {
    uk1: 'UK 1',
    uk2: 'UK 2',
    uk3: 'UK 3',
    uk4: 'UK 4',
    uk5: 'UK 5',
    uk6: 'UK 6',
    uk7: 'UK 7',
    us1: 'US 1',
    us1: 'US 2',
  };

  const dictionary_bobbinManufacturers = {
    littleFalls: 'Little Falls',
    rstLocker: 'RST/Locker',
    wireAlloyInternational: 'Wire Alloy International',
  }

  const dictionary_systems = {
    dwa1: 'DWA #1',
    dwa2: 'DWA #2',
    dwa3: 'DWA #3',
    laser1: 'Laser #1',
    laser2: 'Laser #2',
    laser3: 'Laser #3',
    laser4: 'Laser #4',
    laser5: 'Laser #5',
  };

  for (let i = 0; i < typeForms_winding.length; i++) {
    collatedInfo[dictionaries[i]] = {
      winder: '',
      winderHead: '',
      bobbinManufacturers: '[no information found]',
      winderMaintenenceSignoff: '[no information found]',
      tensionControlSignoff: '[no information found]',
      numberOfReplacedWires: 0,
      numberOfTensionAlarms: 0,
      winding_actionId: '',
      numberOfBadSolders: 0,
      soldering_actionId: '',
      tensions_location: '',
      tensions_system: '',
      tensions_A: [],
      tensions_B: [],
      tensions_actionId: '',
    };

    // ... get information about the winding
    aggregation_stages = [];
    results = [];

    aggregation_stages.push({
      $match: {
        'typeFormId': typeForms_winding[i],
        'componentUuid': MUUID.from(componentUUID),
      }
    });

    aggregation_stages.push({ $sort: { 'validity.version': -1 } });
    aggregation_stages.push({
      $group: {
        _id: { actionId: '$actionId' },
        winder: { '$first': '$data.winder' },
        winderHead: { '$first': '$data.winderHead' },
        wireBobbins: { '$first': '$data.bobbinGrid' },
        winderMaintenenceSignoff: { '$first': '$data.winderMaintenanceVerification' },
        tensionControlSignoff: { '$first': '$data.tensionControlVerification' },
        replacedWires: { '$first': '$data.replacedWires' },
        numberOfTensionAlarms: { '$first': '$data.numberOfTensionAlarms' },
        actionId: { '$first': '$actionId' },
      },
    });

    results = await db.collection('actions')
      .aggregate(aggregation_stages)
      .toArray();

    if (results.length > 0) {
      let bobbinManufacturers = '';

      for (let i = 0; i < results[0].wireBobbins.length; i++) {
        let bobbinUuid = results[0].wireBobbins[i].bobbinUuid;

        const bobbin = await Components.retrieve(MUUID.from(bobbinUuid).toString());

        if (bobbin) bobbinManufacturers += `${dictionary_bobbinManufacturers[bobbin.data.manufacturer]}, `;
      }

      bobbinManufacturers = bobbinManufacturers.substring(0, bobbinManufacturers.length - 2);

      let numberOfReplacedWires = 0;

      for (let i = 0; i < results[0].replacedWires.length; i++) {
        let singleWire_solderPads = results[0].replacedWires[i].solderPad;

        if (typeof singleWire_solderPads === 'number') {
          singleWire_solderPads = `${singleWire_solderPads}`;
        }

        numberOfReplacedWires += singleWire_solderPads.split(',').length;
      }

      collatedInfo[dictionaries[i]].winder = dictionary_winders[results[0].winder];
      collatedInfo[dictionaries[i]].winderHead = dictionary_heads[results[0].winderHead];
      collatedInfo[dictionaries[i]].bobbinManufacturers = bobbinManufacturers;
      collatedInfo[dictionaries[i]].winderMaintenenceSignoff = utils.dictionary_winderMaintenanceSignoff[results[0].winderMaintenenceSignoff];
      collatedInfo[dictionaries[i]].tensionControlSignoff = utils.dictionary_tensionControlSignoff[results[0].tensionControlSignoff];
      collatedInfo[dictionaries[i]].numberOfReplacedWires = numberOfReplacedWires;
      collatedInfo[dictionaries[i]].numberOfTensionAlarms = results[0].numberOfTensionAlarms;
      collatedInfo[dictionaries[i]].winding_actionId = results[0].actionId;
    }

    // ... get information about the soldering
    aggregation_stages = [];
    results = [];

    aggregation_stages.push({
      $match: {
        'typeFormId': typeForms_soldering[i],
        'componentUuid': MUUID.from(componentUUID),
      }
    });

    aggregation_stages.push({ $sort: { 'validity.version': -1 } });
    aggregation_stages.push({
      $group: {
        _id: { actionId: '$actionId' },
        badSolderJoints: { '$first': '$data.badSolderJoints' },
        actionId: { '$first': '$actionId' },
      },
    });

    results = await db.collection('actions')
      .aggregate(aggregation_stages)
      .toArray();

    if (results.length > 0) {
      let numberOfBadSolders = 0;

      for (let i = 0; i < results[0].badSolderJoints.length; i++) {
        let singleJoint_solderPads = results[0].badSolderJoints[i].solderPad;

        if (typeof singleJoint_solderPads === 'number') {
          singleJoint_solderPads = `${singleJoint_solderPads}`;
        }

        numberOfBadSolders += singleJoint_solderPads.split(',').length;
      }

      collatedInfo[dictionaries[i]].numberOfBadSolders = numberOfBadSolders;
      collatedInfo[dictionaries[i]].soldering_actionId = results[0].actionId;
    }

    // ... get information about the (most recently performed) tension measurement
    aggregation_stages = [];
    results = [];

    aggregation_stages.push({
      $match: {
        'typeFormId': 'x_tension_testing',
        'componentUuid': MUUID.from(componentUUID),
        'data.apaLayer': layers[i],
      }
    });

    aggregation_stages.push({ $sort: { 'validity.version': -1 } });
    aggregation_stages.push({
      $group: {
        _id: { actionId: '$actionId' },
        location: { '$first': '$data.location' },
        system: { '$first': '$data.measurementSystem' },
        tensions_A: { '$first': '$data.measuredTensions_sideA' },
        tensions_B: { '$first': '$data.measuredTensions_sideB' },
        actionId: { '$first': '$actionId' },
      },
    });

    results = await db.collection('actions')
      .aggregate(aggregation_stages)
      .toArray();

    if (results.length > 0) {
      collatedInfo[dictionaries[i]].tensions_location = utils.dictionary_locations[results[0].location];
      collatedInfo[dictionaries[i]].tensions_system = dictionary_systems[results[0].system];
      collatedInfo[dictionaries[i]].tensions_A = results[0].tensions_A;
      collatedInfo[dictionaries[i]].tensions_B = results[0].tensions_B;
      collatedInfo[dictionaries[i]].tensions_actionId = results[0].actionId;
    }
  }

  // Get information about any wire related non-conformances on the assembled APA
  const dictionary_apaNCRs_types = {
    missingWireSegment: 'Missing Wire Segment',
    misplacedWireSegment: 'Misplaced Wire Segment',
    shortedWireSegment: 'Shorted Wire Segment',
    geometryBoardIssue: 'Geometry Board Issue',
    combIssue: 'Comb Issue',
    machiningIssue: 'Machining Issue',
    conduitIssue: 'Conduit Issue',
    incorrectFasteners: 'Incorrect Fasteners',
  };

  collatedInfo.apaNCRs_wires = [];
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
      }, {
        'data.nonConformanceType.shortedWireSegment': true
      }],
    }
  });

  aggregation_stages.push({ $sort: { 'validity.version': -1 } });
  aggregation_stages.push({
    $group: {
      _id: { actionId: '$actionId' },
      actionId: { '$first': '$actionId' },
      nonConf_type: { '$first': '$data.nonConformanceType' },
      missingWireData: { '$first': '$data.dataGrid' },
      shortedWireData: { '$first': '$data.shortedGrid' },
    },
  });

  results = await db.collection('actions')
    .aggregate(aggregation_stages)
    .toArray();

  if (results.length > 0) {
    for (const result of results) {
      for (const entry of result.missingWireData) {
        if (entry.wireLayer !== '') {
          let nonConfType = '';

          for (const [key, value] of Object.entries(result.nonConf_type)) {
            if (value) nonConfType = key;
          }

          const dictionary = {
            type: dictionary_apaNCRs_types[nonConfType],
            layerSide: entry.wireLayer.toUpperCase(),
            boardPad: entry.headBoardAndPad,
            endpoints: entry.endPointsForMissingSegment,
            fembChannel: entry.coldElectronicsChannel,
            offlineChannel: entry.offlineChannel,
            actionId: result.actionId,
          }

          collatedInfo.apaNCRs_wires.push(dictionary);
        }
      }

      for (const entry of result.shortedWireData) {
        if (entry.wireLayer !== '') {
          let nonConfType = '';

          for (const [key, value] of Object.entries(result.nonConf_type)) {
            if (value) nonConfType = key;
          }

          const dictionary = {
            type: dictionary_apaNCRs_types[nonConfType],
            layerSide: entry.wireLayer.toUpperCase(),
            boardPad: entry.headBoardAndPad,
            endpoints: entry.endPointsForMissingSegment,
            fembChannel: entry.coldElectronicsChannel,
            offlineChannel: entry.offlineChannel,
            actionId: result.actionId,
          }

          collatedInfo.apaNCRs_wires.push(dictionary);
        }
      }
    }
  }

  // Get information about any non-wire related non-conformances on the assembled APA
  collatedInfo.apaNCRs_other = [];
  aggregation_stages = [];
  results = [];

  aggregation_stages.push({
    $match: {
      'typeFormId': 'APANonConformance',
      'componentUuid': MUUID.from(componentUUID),
      'data.nonConformanceType.missingWireSegment': false,
      'data.nonConformanceType.misplacedWireSegment': false,
      'data.nonConformanceType.shortedWireSegment': false,
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

  if (results.length > 0) {
    for (const result of results) {
      let nonConfType = '';

      for (const [key, value] of Object.entries(result.nonConf_type)) {
        if (value) nonConfType = key;
      }

      const dictionary = {
        component: 'Assembled APA',
        type: dictionary_apaNCRs_types[nonConfType],
        description: result.nonConf_description,
        actionId: result.actionId,
      }

      collatedInfo.apaNCRs_other.push(dictionary);
    }
  }

  // Get information about any non-conformances on the APA frame  
  collatedInfo.frameNCRs = [];
  aggregation_stages = [];
  results = [];

  aggregation_stages.push({
    $match: {
      'typeFormId': 'APANonConformance',
      'componentUuid': MUUID.from(frameUUID),
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

  const dictionary_frameNCRs_types = {
    machiningIssue: 'Machining Issue',
    bow: 'Bow',
    twist: 'Twist',
    survey: 'Survey',
  };

  if (results.length > 0) {
    for (const result of results) {
      let nonConfType = '';

      for (const [key, value] of Object.entries(result.nonConf_type)) {
        if (value) nonConfType = key;
      }

      const dictionary = {
        component: 'APA Frame',
        type: dictionary_frameNCRs_types[nonConfType],
        description: result.nonConf_description,
        actionId: result.actionId,
      }

      collatedInfo.frameNCRs.push(dictionary);
    }
  }

  // Get information about any non-conformances on the mesh panels ...
  // ... first retrieve the most recent 'Mesh Panel Installation' action record performed on the assembled APA, and from that a list of the mesh UUIDs ...
  // ... then retrieve any non-conformance reports that contain any of the mesh UUIDs
  collatedInfo.meshPanelNCRs = [];
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

    const dictionary_meshPanelNCRs_types = {
      holesInMesh: 'Holes in mesh',
      frameIssue: 'Frame issue',
      meshNotTight: 'Mesh not tight',
    };

    if (results.length > 0) {
      for (const result of results) {
        let nonConfType = '';

        for (const [key, value] of Object.entries(result.nonConf_type)) {
          if (value) nonConfType = key;
        }

        const dictionary = {
          component: 'Mesh Panel',
          type: dictionary_meshPanelNCRs_types[nonConfType],
          description: result.nonConf_description,
          actionId: result.actionId,
        }

        collatedInfo.meshPanelNCRs.push(dictionary);
      }
    }
  };

  // Return the completed dictionary of collated information
  return collatedInfo;
}


module.exports = {
  collateInfo,
}
