const MUUID = require('uuid-mongodb');

const Actions = require('./Actions');
const Components = require('./Components');
const { db } = require('./db');
const logger = require('./logger');
const Search_ActionsWorkflows = require('./Search_ActionsWorkflows');
const utils = require('./utils');
const Workflows = require('./Workflows');

const layers = ['x', 'v', 'u', 'g'];
const typeForms_winding = ['x_winding', 'v_winding', 'u_winding', 'g_winding'];
const typeForms_soldering = ['x_solder', 'v_solder', 'u_solder', 'g_solder'];

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

const dictionary_tensionSystems = {
  dwa1: 'DWA #1',
  dwa2: 'DWA #2',
  dwa3: 'DWA #3',
  laser1: 'Laser #1',
  laser2: 'Laser #2',
  laser3: 'Laser #3',
  laser4: 'Laser #4',
  laser5: 'Laser #5',
  laser6: 'Laser #6',
  laser7: 'Laser #7',
  laser8: 'Laser #8',
  laser9: 'Laser #9',
};

const dictionary_ncrTypes = {
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
  holesInMesh: 'Holes in mesh',
  frameIssue: 'Frame issue',
  meshNotTight: 'Mesh not tight',
};


/// Retrieve collated information about a single assembled APA (and associated components and actions), for use in its executive summary
async function forExecSummary(componentUUID) {
  let aggregation_stages = [];
  let results = [];

  // Set up an object to store the collated information, and then set up the various sections of the collated information object
  // Information will be saved as [key, value] pairs for easier access on the interface page, and we know what keys are required ahead of time, so they can be hardcoded
  let collatedInfo = {};

  collatedInfo.assembledAPA = {
    componentName: '',
    componentUUID: '',
    shortUUID: '',
    dunePID: '[no information found]',
    productionSite: '[no information found]',
    configuration: '[no information found]',
    workflowID: '',
    assemblyStatus: -99.9,
  };

  collatedInfo.frameConstruction = {
    signoff_actionID: '[no record found]',
    signoff_name: '[no information found]',
    signoff_date: '',
    intakeSurveys_actionID: '',
    installSurveys_actionID: '',
  };

  collatedInfo.framePreparation = {
    signoff_actionID: '[no record found]',
    signoff_name: '[no information found]',
    signoff_date: '',
    meshInstall_actionID: '',
    rtdInstall_actionID: '',
  };

  for (let i = 0; i < layers.length; i++) {
    collatedInfo[layers[i]] = {
      signoff_actionID: '[no record found]',
      signoff_name: '[no information found]',
      signoff_date: '',
      winding_actionID: '',
      winding_winder: '[no information found]',
      winding_winderHead: '[no information found]',
      winding_bobbinManufacturers: '[no information found]',
      winding_winderMaintenenceSignoff: '[no information found]',
      winding_tensionControlSignoff: '[no information found]',
      winding_numberOfReplacedWires: 0,
      winding_numberOfTensionAlarms: 0,
      soldering_actionID: '',
      soldering_numberOfReworkedSolders: 0,
      tensions_actionID: '',
      tensions_location: '[no information found]',
      tensions_system: '[no information found]',
      tensions_A: [],
      tensions_B: [],
    };
  }

  collatedInfo.coverBoardsAndCaps = {
    signoff_actionID: '[no record found]',
    signoff_name: '[no information found]',
    signoff_date: '',
  };

  collatedInfo.postProduction = {
    signoff_actionID: '[no record found]',
    signoff_name: '[no information found]',
    signoff_date: '',
    panelInstall_actionID: '',
    conduitInstall_actionID: '',
  };

  collatedInfo.completedAPA = {
    signoff_actionID: '[no record found]',
    signoff_name: '[no information found]',
    signoff_date: '',
  };

  collatedInfo.ncrs_useAsIs_withWires = [];
  collatedInfo.ncrs_useAsIs_noWires = [];
  collatedInfo.ncrs_repair = [];
  collatedInfo.ncrs_rework = [];
  collatedInfo.ncrs_other = [];

  /////////////////////
  // APA INFORMATION //
  /////////////////////
  // Get the component record of the Assembled APA, and the UUID of the underlying APA Frame (needed later on for retrieving QC signoffs for frame construction)
  const assembledAPA = await Components.retrieve(componentUUID);
  const frameUUID = assembledAPA.data.frameUuid;

  // Add relevant information from the Assembled APA component record to the 'assembledAPA' section of the collated information object
  collatedInfo.assembledAPA.componentName = assembledAPA.data.componentName;
  collatedInfo.assembledAPA.componentUUID = assembledAPA.componentUuid;
  collatedInfo.assembledAPA.shortUUID = assembledAPA.shortUuid.toString();
  collatedInfo.assembledAPA.dunePID = assembledAPA.data.dunePid;
  collatedInfo.assembledAPA.productionSite = utils.dictionary_locations[assembledAPA.data.apaAssemblyLocation];
  collatedInfo.assembledAPA.configuration = assembledAPA.data.apaConfiguration[0].toUpperCase() + assembledAPA.data.apaConfiguration.slice(1);

  // Get a list of workflows that involve this Assembled APA, specified by its UUID (there should only be one)
  // From this, add relevant information about the workflow to the 'apa' section of the collated information object
  const workflows = await Search_ActionsWorkflows.workflowsByUUID(componentUUID);

  if (workflows.length === 1) {
    collatedInfo.assembledAPA.workflowID = workflows[0].workflowId;

    if (workflows[0].completionStatus) {
      collatedInfo.assembledAPA.assemblyStatus = workflows[0].completionStatus;
    } else {
      collatedInfo.assembledAPA.assemblyStatus = -0.9;
    }
  }

  /////////////////
  // QC SIGNOFFS //
  /////////////////
  // The QC signoffs for frame preparation and winding layers can be found in the Assembled APA's 'Assembled APA QA Check' actions
  // Additional information relating to frame preparation can be found in the Assembled APA's 'Mesh Panel Installation' and 'PD & RTD Installation' actions
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
      collatedInfo.framePreparation.signoff_actionID = result.actionId;
      collatedInfo.framePreparation.signoff_name = utils.dictionary_apaFactoryLeads[result.name];
      collatedInfo.framePreparation.signoff_date = result.date;
    } else if ((result.section === 'xLayerAssembly') || (result.section === 'vLayerAssembly') || (result.section === 'uLayerAssembly') || (result.section === 'gLayerAssembly')) {
      collatedInfo[`${result.section[0]}`].signoff_actionID = result.actionId;
      collatedInfo[`${result.section[0]}`].signoff_name = utils.dictionary_apaFactoryLeads[result.name];
      collatedInfo[`${result.section[0]}`].signoff_date = result.date;
    } else if (result.section === 'coverBoardsAndCaps') {
      collatedInfo.coverBoardsAndCaps.signoff_actionID = result.actionId;
      collatedInfo.coverBoardsAndCaps.signoff_name = utils.dictionary_apaFactoryLeads[result.name];
      collatedInfo.coverBoardsAndCaps.signoff_date = result.date;
    }
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
      actionId: { '$first': '$actionId' },
    },
  });

  results = await db.collection('actions')
    .aggregate(aggregation_stages)
    .toArray();

  if (results.length > 0) {
    collatedInfo.framePreparation.meshInstall_actionID = results[0].actionId;
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
    collatedInfo.framePreparation.rtdInstall_actionID = results[0].actionId;
  }

  // The QC signoff for post production can be found in the Assembled APA's 'Installation into ASF and Close Up' action
  // Additional signoff information relating to post production can be found in the Assembled APA's 'Protection Panel Installation' and 'Cable Conduit Installation' actions
  aggregation_stages = [];
  results = [];

  aggregation_stages.push({
    $match: {
      'typeFormId': 'InstallationIntoASF',
      'componentUuid': MUUID.from(componentUUID),
    }
  });

  aggregation_stages.push({ $sort: { 'validity.version': -1 } });
  aggregation_stages.push({
    $group: {
      _id: { actionId: '$actionId' },
      name: { '$first': '$data.closeUpSignoff' },
      date: { '$first': '$validity.startDate' },
      actionId: { '$first': '$actionId' },
    },
  });

  results = await db.collection('actions')
    .aggregate(aggregation_stages)
    .toArray();

  if (results.length > 0) {
    collatedInfo.postProduction.signoff_actionID = results[0].actionId;
    collatedInfo.postProduction.signoff_name = utils.dictionary_apaFactoryLeads[results[0].name];
    collatedInfo.postProduction.signoff_date = results[0].date;
  }

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
    collatedInfo.postProduction.panelInstall_actionID = results[0].actionId;
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
    collatedInfo.postProduction.conduitInstall_actionID = results[0].actionId;
  }

  // The QC signoff for frame construction can be found in the APA Frame's 'Completed Frame QC Checklist'
  // Additional signoff information related to frame construction can be found in the APA Frame's 'Intake Surveys' and 'Installation Surveys' actions
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
    collatedInfo.frameConstruction.signoff_actionID = results[0].actionId;
    collatedInfo.frameConstruction.signoff_name = utils.dictionary_frameIntakeSignoff[results[0].name];
    collatedInfo.frameConstruction.signoff_date = results[0].date;
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
    collatedInfo.frameConstruction.intakeSurveys_actionID = results[0].actionId;
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
    collatedInfo.frameConstruction.installSurveys_actionID = results[0].actionId;
  }

  // The QC signoff information relating to the completed APA can be found in the Assembled APA's 'Completed APA QC Checklist' action
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
    collatedInfo.completedAPA.signoff_actionID = results[0].actionId;
    collatedInfo.completedAPA.signoff_name = utils.dictionary_apaFactoryLeads[results[0].name];
    collatedInfo.completedAPA.signoff_date = results[0].date;
  }

  ////////////////////////////////////////////
  // WINDING, SOLDERING AND TENSION TESTING //
  ////////////////////////////////////////////
  // Retrieve the (most recent) winding, soldering and tension measurements actions for each wire layer
  // Fill in the remaining information in each layer's section of the collated information object
  for (let i = 0; i < layers.length; i++) {
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
        winderMaintenanceSignoff: { '$first': '$data.winderMaintenanceVerification' },
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

      collatedInfo[layers[i]].winding_actionID = results[0].actionId;
      collatedInfo[layers[i]].winding_winder = dictionary_winders[results[0].winder];
      collatedInfo[layers[i]].winding_winderHead = dictionary_winderHeads[results[0].winderHead];
      collatedInfo[layers[i]].winding_bobbinManufacturers = bobbinManufacturers;
      collatedInfo[layers[i]].winding_winderMaintenanceSignoff = utils.dictionary_winderMaintenanceSignoff[results[0].winderMaintenanceSignoff];
      collatedInfo[layers[i]].winding_tensionControlSignoff = utils.dictionary_winderMaintenanceSignoff[results[0].tensionControlSignoff];
      collatedInfo[layers[i]].winding_numberOfReplacedWires = numberOfReplacedWires;
      collatedInfo[layers[i]].winding_numberOfTensionAlarms = results[0].numberOfTensionAlarms;
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
      let numberOfReworkedSolders = 0;

      for (let i = 0; i < results[0].badSolderJoints.length; i++) {
        let singleJoint_solderPads = results[0].badSolderJoints[i].solderPad;

        if (typeof singleJoint_solderPads === 'number') {
          singleJoint_solderPads = `${singleJoint_solderPads}`;
        }

        numberOfReworkedSolders += singleJoint_solderPads.split(',').length;
      }

      collatedInfo[layers[i]].soldering_actionID = results[0].actionId;
      collatedInfo[layers[i]].soldering_numberOfReworkedSolders = numberOfReworkedSolders;
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
      collatedInfo[layers[i]].tensions_actionID = results[0].actionId;
      collatedInfo[layers[i]].tensions_location = utils.dictionary_locations[results[0].location];
      collatedInfo[layers[i]].tensions_system = dictionary_tensionSystems[results[0].system];
      collatedInfo[layers[i]].tensions_A = results[0].tensions_A;
      collatedInfo[layers[i]].tensions_B = results[0].tensions_B;
    }
  }

  //////////////////////////
  // APA NON-CONFORMANCES //
  //////////////////////////
  // Get information about any and all non-conformance actions performed on the Assembled APA
  aggregation_stages = [];
  results = [];

  aggregation_stages.push({
    $match: {
      'typeFormId': 'APANonConformance',
      'componentUuid': MUUID.from(componentUUID),
    }
  });

  aggregation_stages.push({ $sort: { 'validity.version': -1 } });
  aggregation_stages.push({
    $group: {
      _id: { actionId: '$actionId' },
      actionId: { '$first': '$actionId' },
      disposition: { '$first': '$data.disposition' },
      title: { '$first': '$data.nonConformanceTitle' },
      description: { '$first': '$data.nonConformanceDescription' },
      nonConf_type: { '$first': '$data.nonConformanceType' },
      missingWireData: { '$first': '$data.dataGrid' },
      shortedWireData: { '$first': '$data.shortedGrid' },
    },
  });

  aggregation_stages.push({ $sort: { 'title': 1 } });

  results = await db.collection('actions')
    .aggregate(aggregation_stages)
    .toArray();

  // Copy the information about each NCR into the corresponding 'ncrs_XXX' section of the collated information object, depending on the disposition and if there are missing or shorted wires present
  // Note that the 'Use As Is', 'Repair' and 'Rework' dispositions each have separate sections, but the others ('Return to Supplier', 'Reject / Re-purpose' and 'Scrap') are grouped together
  if (results.length > 0) {
    for (let result of results) {
      let typesString = '';

      for (const [key, value] of Object.entries(result.nonConf_type)) {
        if (value) {
          typesString += `${dictionary_ncrTypes[key]}, `;
        }
      }

      result.types = typesString.substring(0, typesString.length - 2);

      if (result.disposition === 'useAsIs') {
        let missingShortedWires = [];

        if (result.missingWireData[0].hasOwnProperty('wireLayer')) {
          if (result.missingWireData[0].wireLayer !== '') {
            for (const missingWire of result.missingWireData) {
              missingShortedWires.push({
                wireType: 'Missing Wire / Wire Seg.',
                wireLayer: missingWire.wireLayer.toUpperCase(),
                headBoardAndPad: missingWire.headBoardAndPad,
                endPointsForMissingSegment: missingWire.endPointsForMissingSegment,
                offlineChannel: missingWire.offlineChannel,
                coldElectronicsChannel: missingWire.coldElectronicsChannel,
              })
            }
          }
        }

        if (result.shortedWireData[0].hasOwnProperty('wireLayer')) {
          if (result.shortedWireData[0].wireLayer !== '') {
            for (const shortedWire of result.shortedWireData) {
              missingShortedWires.push({
                wireType: 'Shorted Wire / Wire Seg.',
                wireLayer: shortedWire.wireLayer.toUpperCase(),
                headBoardAndPad: shortedWire.headBoardAndPad,
                endPointsForMissingSegment: shortedWire.endPointsForMissingSegment,
                offlineChannel: shortedWire.offlineChannel,
                coldElectronicsChannel: shortedWire.coldElectronicsChannel,
              })
            }
          }
        }

        if (missingShortedWires.length > 0) {
          result.missingShortedWires = missingShortedWires;

          delete result.nonConf_type;
          delete result.missingWireData;
          delete result.shortedWireData;

          collatedInfo.ncrs_useAsIs_withWires.push(result);
        } else {
          collatedInfo.ncrs_useAsIs_noWires.push(result);
        }
      } else if (result.disposition === 'repair') {
        collatedInfo.ncrs_repair.push(result);
      } else if (result.disposition === 'rework') {
        collatedInfo.ncrs_rework.push(result);
      } else {
        collatedInfo.ncrs_other.push(result);
      }
    }
  }

  // Return the completed collated information object
  return collatedInfo;
}


/// Retrieve collated information about two specified APAs comprising a single doublet, for use in the DUNE HWDB
async function forHWDB(apa1UUID, apa2UUID) {
  // Set up an array of the APA UUIDs ... this will allow the collating of information to be done in a loop, instead of having to explicitly duplicate the code
  // Then set up a corresponding array that will contain (and return) the combined collated information about both APAs
  const apaUuids = [apa1UUID, apa2UUID];
  let apaInformation = [];

  // For each APA UUID ...
  for (const apaUuid of apaUuids) {
    // Retrieve collated information about the APA using the already-existing function that does the same for populating Executive Summaries
    // Since the information is identical here, it doesn't make any sense to re-code the retrieval all over again for this function
    const collatedInfo = await forExecSummary(apaUuid);

    // Define the object that will hold the information about a single APA in the structure required by the HWDB
    let singleAPA = {};

    singleAPA = {
      part_id: "",
      data: {
        components: {
          assembledAPA: {},
          apaFrame: {},
          tempSensors: {},
        },
        signoffs: {
          frameConstruction: {},
          framePreparation: {},
          xLayer: {},
          vLayer: {},
          uLayer: {},
          gLayer: {},
          coverBoardsAndCaps: {},
          postProduction: {},
          completedAPA: {},
        },
        brokenWires: [],
        measurements: {
          tempSensorResistances: {},
          xLayer: {},
          vLayer: {},
          uLayer: {},
          gLayer: {},
        },
      },
    };

    ///////////////////////////
    // COMPONENT INFORMATION //
    ///////////////////////////
    // Information about the APA itself is found in the collated information object
    singleAPA.part_id = collatedInfo.assembledAPA.dunePID;

    singleAPA.data.components.assembledAPA['apaDB_componentName'] = collatedInfo.assembledAPA.componentName;
    singleAPA.data.components.assembledAPA['apaDB_componentUUID'] = collatedInfo.assembledAPA.componentUUID;
    singleAPA.data.components.assembledAPA['apaDB_componentQRCode'] = `https://apa.dunedb.org/c/${collatedInfo.assembledAPA.shortUUID}`;
    singleAPA.data.components.assembledAPA['productionSite'] = collatedInfo.assembledAPA.productionSite;
    singleAPA.data.components.assembledAPA['configuration'] = collatedInfo.assembledAPA.configuration;
    singleAPA.data.components.assembledAPA['apaDB_assemblyWorkflow'] = `https://apa.dunedb.org/workflow/${collatedInfo.assembledAPA.workflowID}`;
    singleAPA.data.components.assembledAPA['assemblyStatus'] = collatedInfo.assembledAPA.assemblyStatus;

    // Additional information about the APA Frame is found in its component record
    const assembledAPA = await Components.retrieve(apaUuid);
    const apaFrame = await Components.retrieve(assembledAPA.data.frameUuid);

    singleAPA.data.components.apaFrame['part_id'] = apaFrame.data.dunePid;
    singleAPA.data.components.apaFrame['apaDB_componentName'] = apaFrame.data.componentName;
    singleAPA.data.components.apaFrame['apaDB_componentUUID'] = apaFrame.componentUuid;
    singleAPA.data.components.apaFrame['apaDB_componentQRCode'] = `https://apa.dunedb.org/c/${apaFrame.shortUuid.toString()}`;

    // Additional information about the temperature sensors is found in the 'Frame Prep - Photon Detector Cable and Temperature Sensor Installation' action of the workflow ...
    // ... use the mapping document to find the temperature sensors' DUNE PIDs from the serial numbers stored in the action
    const apaAssemblyWorkflow = await Workflows.retrieve(assembledAPA.workflowId);
    const tempSensorInstallAction = await Actions.retrieve(apaAssemblyWorkflow.path[5].result);

    const tempSensorSerialNumbers = [
      tempSensorInstallAction.data.tempSensorSerialNumber,
      tempSensorInstallAction.data.tempSensorSerialNumber1,
      tempSensorInstallAction.data.tempSensorSerialNumber2,
      tempSensorInstallAction.data.tempSensorSerialNumber3,
    ];

    const tempSensorLocations = [
      tempSensorInstallAction.data.tempSensorLocation1,
      tempSensorInstallAction.data.tempSensorLocation2,
      tempSensorInstallAction.data.tempSensorLocation3,
      tempSensorInstallAction.data.tempSensorLocation4,
    ];

    // ********** TBD - mapping from temperature sensor serial number to DUNE PID ********** //
    const tempSensorPIDs = [
      '[DUNE PID goes here]',
      '[DUNE PID goes here]',
      '[DUNE PID goes here]',
      '[DUNE PID goes here]',
    ];

    for (const [index, serialNumber] of tempSensorSerialNumbers.entries()) {
      singleAPA.data.components.tempSensors[`Temperature Sensor ${tempSensorLocations[index]} (${serialNumber})`] = tempSensorPIDs[index];
    }

    /////////////////
    // QC SIGNOFFS //
    /////////////////
    // Information about the QC signoffs is found in the collated information object
    singleAPA.data.signoffs.frameConstruction['name'] = collatedInfo.frameConstruction.signoff_name;
    singleAPA.data.signoffs.frameConstruction['date'] = collatedInfo.frameConstruction.signoff_date;
    singleAPA.data.signoffs.frameConstruction['apaDB_signoff'] = `https://apa.dunedb.org/action/${collatedInfo.frameConstruction.signoff_actionID}`;
    singleAPA.data.signoffs.frameConstruction['apaDB_intakeSurveys'] = `https://apa.dunedb.org/action/${collatedInfo.frameConstruction.intakeSurveys_actionID}`;
    singleAPA.data.signoffs.frameConstruction['apaDB_installSurveys'] = `https://apa.dunedb.org/action/${collatedInfo.frameConstruction.installSurveys_actionID}`;

    singleAPA.data.signoffs.framePreparation['name'] = collatedInfo.framePreparation.signoff_name;
    singleAPA.data.signoffs.framePreparation['date'] = collatedInfo.framePreparation.signoff_date;
    singleAPA.data.signoffs.framePreparation['apaDB_signoff'] = `https://apa.dunedb.org/action/${collatedInfo.framePreparation.signoff_actionID}`;
    singleAPA.data.signoffs.framePreparation['apaDB_meshInstall'] = `https://apa.dunedb.org/action/${collatedInfo.framePreparation.meshInstall_actionID}`;
    singleAPA.data.signoffs.framePreparation['apaDB_rtdInstall'] = `https://apa.dunedb.org/action/${collatedInfo.framePreparation.rtdInstall_actionID}`;

    for (let i = 0; i < layers.length; i++) {
      singleAPA.data.signoffs[`${layers[i]}Layer`]['name'] = collatedInfo[layers[i]].signoff_name;
      singleAPA.data.signoffs[`${layers[i]}Layer`]['date'] = collatedInfo[layers[i]].signoff_date;
      singleAPA.data.signoffs[`${layers[i]}Layer`]['apaDB_signoff'] = `https://apa.dunedb.org/action/${collatedInfo[layers[i]].signoff_actionID}`;
    };

    singleAPA.data.signoffs.coverBoardsAndCaps['name'] = collatedInfo.coverBoardsAndCaps.signoff_name;
    singleAPA.data.signoffs.coverBoardsAndCaps['date'] = collatedInfo.coverBoardsAndCaps.signoff_date;
    singleAPA.data.signoffs.coverBoardsAndCaps['apaDB_signoff'] = `https://apa.dunedb.org/action/${collatedInfo.coverBoardsAndCaps.signoff_actionID}`;

    singleAPA.data.signoffs.postProduction['name'] = collatedInfo.postProduction.signoff_name;
    singleAPA.data.signoffs.postProduction['date'] = collatedInfo.postProduction.signoff_date;
    singleAPA.data.signoffs.postProduction['apaDB_signoff'] = `https://apa.dunedb.org/action/${collatedInfo.postProduction.signoff_actionID}`;
    singleAPA.data.signoffs.postProduction['apaDB_panelInstallURL'] = `https://apa.dunedb.org/action/${collatedInfo.postProduction.panelInstall_actionID}`;
    singleAPA.data.signoffs.postProduction['apaDB_conduitInstallURL'] = `https://apa.dunedb.org/action/${collatedInfo.postProduction.conduitInstall_actionID}`;

    singleAPA.data.signoffs.completedAPA['name'] = collatedInfo.completedAPA.signoff_name;
    singleAPA.data.signoffs.completedAPA['date'] = collatedInfo.completedAPA.signoff_date;
    singleAPA.data.signoffs.completedAPA['apaDB_signoff'] = `https://apa.dunedb.org/action/${collatedInfo.completedAPA.signoff_actionID}`;

    //////////////////
    // BROKEN WIRES //
    //////////////////
    // Information about broken (damaged, missing or shorted) wires is found in the 'ncrs_useAsIs_withWires' section of the collated information object
    for (const ncr of collatedInfo.ncrs_useAsIs_withWires) {
      for (const wire of ncr.missingShortedWires) {
        singleAPA.data.brokenWires.push({
          type: wire.wireType,
          sideAndLayer: wire.wireLayer,
          headBoardAndPad: wire.headBoardAndPad,
          endPointsForMissingSegment: wire.endPointsForMissingSegment,
          offlineChannel: wire.offlineChannel,
          coldElectronicsChannel: wire.coldElectronicsChannel,
        })
      }
    }

    //////////////////
    // MEASUREMENTS //
    //////////////////
    // Additional information about the temperature sensor resistances is found in the previously retrieved 'Frame Prep - Photon Detector Cable and Temperature Sensor Installation' action
    const tempSensorResistances = [
      tempSensorInstallAction.data.sensorResistance1,
      tempSensorInstallAction.data.sensorResistance2,
      tempSensorInstallAction.data.sensorResistance3,
      tempSensorInstallAction.data.sensorResistance4,
    ];

    for (const [index, serialNumber] of tempSensorSerialNumbers.entries()) {
      singleAPA.data.measurements.tempSensorResistances[`Temperature Sensor ${tempSensorLocations[index]} (${serialNumber})`] = tempSensorResistances[index];
    }

    // Information about the layer assemblies is found in the collated information object
    for (let i = 0; i < layers.length; i++) {
      singleAPA.data.measurements[`${layers[i]}Layer`]['winder'] = collatedInfo[layers[i]].winding_winder;
      singleAPA.data.measurements[`${layers[i]}Layer`]['winderHead'] = collatedInfo[layers[i]].winding_winderHead;
      singleAPA.data.measurements[`${layers[i]}Layer`]['wireBobbinManufacturers'] = collatedInfo[layers[i]].winding_bobbinManufacturers;
      singleAPA.data.measurements[`${layers[i]}Layer`]['winderMaintenanceSignoff'] = collatedInfo[layers[i]].winding_winderMaintenanceSignoff;
      singleAPA.data.measurements[`${layers[i]}Layer`]['tensionControlSignoff'] = collatedInfo[layers[i]].winding_tensionControlSignoff;
      singleAPA.data.measurements[`${layers[i]}Layer`]['numberOfReplacedWires'] = collatedInfo[layers[i]].winding_numberOfReplacedWires;
      singleAPA.data.measurements[`${layers[i]}Layer`]['numberOfTensionAlarms'] = collatedInfo[layers[i]].winding_numberOfTensionAlarms;
      singleAPA.data.measurements[`${layers[i]}Layer`]['apaDB_winding'] = `https://apa.dunedb.org/action/${collatedInfo[layers[i]].winding_actionID}`;

      singleAPA.data.measurements[`${layers[i]}Layer`]['numberOfReworkedSolders'] = collatedInfo[layers[i]].soldering_numberOfReworkedSolders;
      singleAPA.data.measurements[`${layers[i]}Layer`]['apaDB_soldering'] = `https://apa.dunedb.org/action/${collatedInfo[layers[i]].soldering_actionID}`;

      singleAPA.data.measurements[`${layers[i]}Layer`]['tensionMeasurementLocation'] = collatedInfo[layers[i]].tensions_location;
      singleAPA.data.measurements[`${layers[i]}Layer`]['tensionSystem'] = collatedInfo[layers[i]].tensions_system;
      singleAPA.data.measurements[`${layers[i]}Layer`]['tensions_A'] = collatedInfo[layers[i]].tensions_A;
      singleAPA.data.measurements[`${layers[i]}Layer`]['tensions_B'] = collatedInfo[layers[i]].tensions_B;
      singleAPA.data.measurements[`${layers[i]}Layer`]['apaDB_tensionMeasurements'] = `https://apa.dunedb.org/action/${collatedInfo[layers[i]].tensions_actionID}`;
    }

    // Save the collated information about this APA into the array
    apaInformation.push(singleAPA);
  }

  // Return the array containing the combined collated information about both APAs
  return apaInformation;
}


module.exports = {
  forExecSummary,
  forHWDB,
}
