const MUUID = require('uuid-mongodb');

const Actions = require('./Actions');
const Components = require('./Components');
const { db } = require('./db');
const Search_ActionsWorkflows = require('./Search_ActionsWorkflows');
const Workflows = require('./Workflows');
const utils = require('./utils');

const layerSection_names = ['layer_x', 'layer_v', 'layer_u', 'layer_g'];
const typeForms_winding = ['x_winding', 'v_winding', 'u_winding', 'g_winding'];

const dictionary_winders = {
  ukWinder1: 'UK Winder 1',
  ukWinder2: 'UK Winder 2',
  ukWinder3: 'UK Winder 3',
  ukWinder4: 'UK Winder 4',
  ukWinder5: 'UK Winder 5',
  usWinder1: 'US Winder 1',
};

const dictionary_winderHeads = {
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

const typeForms_soldering = ['x_solder', 'v_solder', 'u_solder', 'g_solder'];
const layers = ['x', 'v', 'u', 'g'];

const dictionary_tensionSystems = {
  dwa1: 'DWA #1',
  dwa2: 'DWA #2',
  dwa3: 'DWA #3',
  laser1: 'Laser #1',
  laser2: 'Laser #2',
  laser3: 'Laser #3',
  laser4: 'Laser #4',
  laser5: 'Laser #5',
};

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

const dictionary_frameNCRs_types = {
  machiningIssue: 'Machining Issue',
  bow: 'Bow',
  twist: 'Twist',
  survey: 'Survey',
};

const dictionary_meshPanelNCRs_types = {
  holesInMesh: 'Holes in mesh',
  frameIssue: 'Frame issue',
  meshNotTight: 'Mesh not tight',
};


/// Retrieve collated information about a single assembled APA (and associated components and actions) that will be displayed in its executive summary
async function collateInfo(componentUUID) {
  let aggregation_stages = [];
  let results = [];

  // Set up an object to store the collated information, and then set up the various sections of the collated information object
  // Information will be saved as [key, value] pairs for easier access on the interface page, and we know what keys are required ahead of time, so they can be hardcoded
  let collatedInfo = {};

  collatedInfo.general = {
    dunePID: '[no information found]',
    productionSite: '[no information found]',
    configuration: '[no information found]',
    assemblyStatus: -99.9,
    workflowID: '',
  };

  collatedInfo.frameConstr = {
    qaCheckID: '[no record found]',
    name: '[no information found]',
    date: '',
    intakeSurveysID: '',
    installSurveysID: '',
  };

  collatedInfo.framePrep = {
    qaCheckID: '[no record found]',
    name: '[no information found]',
    date: '',
    meshInstallID: '',
    rtdInstallID: '',
  };

  for (let i = 0; i < layerSection_names.length; i++) {
    collatedInfo[layerSection_names[i]] = {
      qaCheckID: '[no record found]',
      name: '[no information found]',
      date: '',
      windingID: '',
      winder: '[no information found]',
      winderHead: '[no information found]',
      bobbinManufacturers: '[no information found]',
      winderMaintenenceSignoff: '[no information found]',
      tensionControlSignoff: '[no information found]',
      numberOfReplacedWires: 0,
      numberOfTensionAlarms: 0,
      numberOfBadSolders: 0,
      solderingID: '',
      tensionsID: '',
      tensions_location: '[no information found]',
      tensions_system: '[no information found]',
      tensions_A: [],
      tensions_B: [],
    };
  }

  collatedInfo.coverCaps = {
    qaCheckID: '[no record found]',
    name: '[no information found]',
    date: '',
  };

  collatedInfo.shippingPrep = {
    qaCheckID: '[no record found]',
    name: '[no information found]',
    date: '',
    panelInstallID: '',
    conduitInstallID: '',
  };

  collatedInfo.completedAPA = {
    qaCheckID: '[no record found]',
    name: '[no information found]',
    date: '',
  };

  collatedInfo.apaNCRs_wires = [];
  collatedInfo.apaNCRs_other = [];
  collatedInfo.frameNCRs = [];
  collatedInfo.meshPanelNCRs = [];

  /////////////////////////
  // GENERAL INFORMATION //
  /////////////////////////
  // Get the component record of the assembled APA, and the UUID of the underlying APA frame
  const assembledAPA = await Components.retrieve(componentUUID);
  const frameUUID = assembledAPA.data.frameUuid;

  // Add relevant information from the APA's component record to the 'general' section of the collated information object
  collatedInfo.general.dunePID = assembledAPA.data.name;
  collatedInfo.general.productionSite = utils.dictionary_locations[assembledAPA.data.apaAssemblyLocation];
  collatedInfo.general.configuration = assembledAPA.data.apaConfiguration[0].toUpperCase() + assembledAPA.data.apaConfiguration.slice(1);

  // Get a list of workflows that involve the assembled APA, specified by its UUID (there should only be one)
  // From this, add relevant information about the workflow to the 'general' section of the collated information object
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

    collatedInfo.general.assemblyStatus = (numberOfCompleteActions * 100.0) / (workflow.path.length - 1);
    collatedInfo.general.workflowID = workflow.workflowId;
  }

  /////////////////
  // QC SIGNOFFS //
  /////////////////
  // Some of the QC signoff information can be found in the various 'Assembled APA QA Check' type actions that have been performed on the APA
  // The most efficient approach is to retrieve all of these at once from the DB, and then get the signoff information from each one depending on which part of the assembly it corresponds to
  aggregation_stages = [];
  results = [];

  aggregation_stages.push({
    $match: {
      'typeFormId': 'AssembledAPAQACheck',
      'componentUuid': MUUID.from(componentUUID),
    }
  });

  aggregation_stages.push({ $sort: { 'validity.version': -1 } });
  aggregation_stages.push({
    $group: {
      _id: { actionId: '$actionId' },
      section: { '$first': '$data.workflowSectionBeingQAed' },
      name: { '$first': '$data.personSigningOff' },
      date: { '$first': '$validity.startDate' },
      actionId: { '$first': '$actionId' },
    },
  });

  results = await db.collection('actions')
    .aggregate(aggregation_stages)
    .toArray();

  for (const result of results) {
    if (result.section === 'framePreparation') {
      collatedInfo.framePrep.qaCheckID = result.actionId;
      collatedInfo.framePrep.name = utils.dictionary_apaFactoryLeads[result.name];
      collatedInfo.framePrep.date = result.date;
    } else if ((result.section === 'xLayerAssembly') || (result.section === 'vLayerAssembly') || (result.section === 'uLayerAssembly') || (result.section === 'gLayerAssembly')) {
      collatedInfo[`layer_${result.section[0]}`].qaCheckID = result.actionId;
      collatedInfo[`layer_${result.section[0]}`].name = utils.dictionary_apaFactoryLeads[result.name];
      collatedInfo[`layer_${result.section[0]}`].date = result.date;
    } else if (result.section === 'coverBoardsAndCaps') {
      collatedInfo.coverCaps.qaCheckID = result.actionId;
      collatedInfo.coverCaps.name = utils.dictionary_apaFactoryLeads[result.name];
      collatedInfo.coverCaps.date = result.date;
    } else if (result.section === 'shippingPreparation') {
      collatedInfo.shippingPrep.qaCheckID = result.actionId;
      collatedInfo.shippingPrep.name = utils.dictionary_apaFactoryLeads[result.name];
      collatedInfo.shippingPrep.date = result.date;
    }
  };

  // Signoff information relating to APA frame construction can be ONLY found in the frame's 'Completed Frame QC Checklist', 'Intake Surveys' and 'Installation Surveys' actions
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
      name: { '$first': '$data.personSigningOff' },
      date: { '$first': '$validity.startDate' },
      actionId: { '$first': '$actionId' },
    },
  });

  results = await db.collection('actions')
    .aggregate(aggregation_stages)
    .toArray();

  if (results.length > 0) {
    collatedInfo.frameConstr.qaCheckID = results[0].actionId;
    collatedInfo.frameConstr.name = utils.dictionary_frameIntakeSignoff[results[0].name];
    collatedInfo.frameConstr.date = results[0].date;
  }

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
    collatedInfo.frameConstr.intakeSurveysID = results[0].actionId;
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
    collatedInfo.frameConstr.installSurveysID = results[0].actionId;
  }

  // Additional signoff information relating to APA frame preparation can also be found in the APA's 'Mesh Panel Installation' and 'PD & RTD Installation' actions
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
    },
  });

  results = await db.collection('actions')
    .aggregate(aggregation_stages)
    .toArray();

  if (results.length > 0) {
    collatedInfo.framePrep.meshInstallID = results[0].actionId;
  }

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
      actionId: { '$first': '$actionId' },
    },
  });

  results = await db.collection('actions')
    .aggregate(aggregation_stages)
    .toArray();

  if (results.length > 0) {
    collatedInfo.framePrep.rtdInstallID = results[0].actionId;
  }

  // Additional signoff information relating to APA shipping preparation can also be found in the APA's 'Protection Panel Installation' and 'Cable Conduit Installation' actions
  aggregation_stages = [];
  results = [];

  aggregation_stages.push({
    $match: {
      'typeFormId': 'ProtectionPanelInstallation',
      'componentUuid': MUUID.from(componentUUID),
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
    collatedInfo.shippingPrep.panelInstallID = results[0].actionId;
  }

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
      actionId: { '$first': '$actionId' },
    },
  });

  results = await db.collection('actions')
    .aggregate(aggregation_stages)
    .toArray();

  if (results.length > 0) {
    collatedInfo.shippingPrep.conduitInstallID = results[0].actionId;
  }

  // Signoff information relating to the completed APA can ONLY be found in the APA's 'Completed APA QC Checklist' action
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
      name: { '$first': '$data.personSigningOff' },
      date: { '$first': '$validity.startDate' },
      actionId: { '$first': '$actionId' },
    },
  });

  results = await db.collection('actions')
    .aggregate(aggregation_stages)
    .toArray();

  if (results.length > 0) {
    collatedInfo.completedAPA.qaCheckID = results[0].actionId;
    collatedInfo.completedAPA.name = utils.dictionary_apaFactoryLeads[results[0].name];
    collatedInfo.completedAPA.date = results[0].date;
  }

  /////////////////
  // WIRE LAYERS //
  /////////////////
  // Retrieve the winding, soldering and (most recent) tension measurements actions for each wire layer
  // Fill in the remaining information in each layer-specific section of the collated information object
  for (let i = 0; i < layerSection_names.length; i++) {
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

      collatedInfo[layerSection_names[i]].winder = dictionary_winders[results[0].winder];
      collatedInfo[layerSection_names[i]].winderHead = dictionary_winderHeads[results[0].winderHead];
      collatedInfo[layerSection_names[i]].bobbinManufacturers = bobbinManufacturers;
      collatedInfo[layerSection_names[i]].winderMaintenenceSignoff = utils.dictionary_winderMaintenanceSignoff[results[0].winderMaintenenceSignoff];
      collatedInfo[layerSection_names[i]].tensionControlSignoff = utils.dictionary_tensionControlSignoff[results[0].tensionControlSignoff];
      collatedInfo[layerSection_names[i]].numberOfReplacedWires = numberOfReplacedWires;
      collatedInfo[layerSection_names[i]].numberOfTensionAlarms = results[0].numberOfTensionAlarms;
      collatedInfo[layerSection_names[i]].windingID = results[0].actionId;
    }

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

      collatedInfo[layerSection_names[i]].numberOfBadSolders = numberOfBadSolders;
      collatedInfo[layerSection_names[i]].solderingID = results[0].actionId;
    }

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
      collatedInfo[layerSection_names[i]].tensions_location = utils.dictionary_locations[results[0].location];
      collatedInfo[layerSection_names[i]].tensions_system = dictionary_tensionSystems[results[0].system];
      collatedInfo[layerSection_names[i]].tensions_A = results[0].tensions_A;
      collatedInfo[layerSection_names[i]].tensions_B = results[0].tensions_B;
      collatedInfo[layerSection_names[i]].tensionsID = results[0].actionId;
    }
  }

  ///////////////////////////////////////
  // WIRE-RELATED APA NON-CONFORMANCES //
  ///////////////////////////////////////
  // Get information about any wire related non-conformances on the assembled APA
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

          collatedInfo.apaNCRs_wires.push({
            type: dictionary_apaNCRs_types[nonConfType],
            layerSide: entry.wireLayer.toUpperCase(),
            boardPad: entry.headBoardAndPad,
            endpoints: entry.endPointsForMissingSegment,
            fembChannel: entry.coldElectronicsChannel,
            offlineChannel: entry.offlineChannel,
            actionId: result.actionId,
          });
        }
      }

      for (const entry of result.shortedWireData) {
        if (entry.wireLayer !== '') {
          let nonConfType = '';

          for (const [key, value] of Object.entries(result.nonConf_type)) {
            if (value) nonConfType = key;
          }

          collatedInfo.apaNCRs_wires.push({
            type: dictionary_apaNCRs_types[nonConfType],
            layerSide: entry.wireLayer.toUpperCase(),
            boardPad: entry.headBoardAndPad,
            endpoints: entry.endPointsForMissingSegment,
            fembChannel: entry.coldElectronicsChannel,
            offlineChannel: entry.offlineChannel,
            actionId: result.actionId,
          });
        }
      }
    }
  }

  ////////////////////////////////
  // OTHER APA NON-CONFORMANCES //
  ////////////////////////////////
  // Get information about any non-wire related non-conformances on the assembled APA
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

  ////////////////////////////
  // FRAME NON-CONFORMANCES //
  ////////////////////////////
  // Get information about any non-conformances on the APA frame  
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

  /////////////////////////////////
  // MESH PANEL NON-CONFORMANCES //
  /////////////////////////////////
  // Get information about any non-conformances on the mesh panels ...
  // ... first retrieve the most recent 'Mesh Panel Installation' action record performed on the assembled APA, and from that a list of the mesh UUIDs ...
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

  // Return the completed collated information object
  return collatedInfo;
}


module.exports = {
  collateInfo,
}
