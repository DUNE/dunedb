const MUUID = require('uuid-mongodb');
const ObjectId = require('mongodb').ObjectId;

const Actions = require('./Actions');
const { db } = require('./db');
const Components = require('./Components');
const Forms = require('./Forms');
const logger = require('./logger');
const utils = require('./utils');
const Workflows = require('./Workflows');


async function cleanActionTypeFormIds(oldTypeFormId) {
  let newTypeFormId = null;
  let newTypeFormName = null;
  let workflowTypeFormId = null;
  let workflowStepIndex = null;

  if (oldTypeFormId === 'AssembledAPAQACheck') {
    newTypeFormId = 'SingleLayerQACheck';
    newTypeFormName = 'Single Layer QA Check';
    workflowTypeFormId = 'APA_Assembly';
    workflowStepIndex = [10, 15, 24, 33, 42, 47];
  } else if (oldTypeFormId === 'clamp_plate_removal') {
    newTypeFormId = 'SingleLayerClampPlateRemoval';
    newTypeFormName = 'Single Layer Clamp Plate Removal';
    workflowTypeFormId = 'APA_Assembly';
    workflowStepIndex = [19, 28, 37, 46];
  } else if (oldTypeFormId === 'comb_cap_install') {
    newTypeFormId = 'CombCapInstallation';
    newTypeFormName = 'Comb Cap Installation';
    workflowTypeFormId = 'APA_Assembly';
    workflowStepIndex = [43];
  } else if (oldTypeFormId === 'CompletedAPAQCChecklist') {
    newTypeFormId = 'CompletedAPAQAChecklist';
    newTypeFormName = 'Completed APA QA Checklist';
    workflowTypeFormId = 'APA_Assembly';
    workflowStepIndex = [51];
  } else if (oldTypeFormId === 'cover_boards') {
    newTypeFormId = 'CoverBoardInstallation';
    newTypeFormName = 'Cover Board Installation';
    workflowTypeFormId = 'APA_Assembly';
    workflowStepIndex = [45];
  } else if (oldTypeFormId === 'electrical_testing') {
    newTypeFormId = 'SingleLayerElectricalTesting';
    newTypeFormName = 'Single Layer Electrical Testing';
    workflowTypeFormId = 'APA_Assembly';
    workflowStepIndex = [14, 23, 32, 41];
  } else if (oldTypeFormId === 'prep_comb_base_install_sideA1') {
    newTypeFormId = 'FramePrepCombBaseInstallation';
    newTypeFormName = 'Frame Prep - Comb Base Installation';
    workflowTypeFormId = 'APA_Assembly';
    workflowStepIndex = [6, 7];
  } else if (oldTypeFormId === 'FramePrepTorqueCheck') {
    newTypeFormId = 'FramePrepFastenerTorqueCheck';
    newTypeFormName = 'Frame Prep - Fastener Torque Check';
    workflowTypeFormId = 'APA_Assembly';
    workflowStepIndex = [1];
  } else if (oldTypeFormId === 'mesh_bracket_install') {
    newTypeFormId = 'FramePrepGroundingMeshPanelBracketInstallation';
    newTypeFormName = 'Frame Prep - Grounding Mesh Panel Bracket Installation';
    workflowTypeFormId = 'APA_Assembly';
    workflowStepIndex = [2];
  } else if (oldTypeFormId === 'prep_mesh_panel_install') {
    newTypeFormId = 'FramePrepGroundingMeshPanelInstallation';
    newTypeFormName = 'Frame Prep - Grounding Mesh Panel Installation';
    workflowTypeFormId = 'APA_Assembly';
    workflowStepIndex = [8];
  } else if (oldTypeFormId === 'pd_cable_temp_sensor_install') {
    newTypeFormId = 'FramePrepPDCableTemperatureSensorInstallation';
    newTypeFormName = 'Frame Prep - Photon Detector Cable and Temperature Sensor Installation';
    workflowTypeFormId = 'APA_Assembly';
    workflowStepIndex = [5];
  } else if (oldTypeFormId === 'pd_rail_alignment') {
    newTypeFormId = 'FramePrepPDRailAlignment';
    newTypeFormName = 'Frame Prep - Photon Detector Rail Alignment';
    workflowTypeFormId = 'APA_Assembly';
    workflowStepIndex = [4];
  } else if (oldTypeFormId === 'pd_rail_install') {
    newTypeFormId = 'FramePrepPDRailInstallation';
    newTypeFormName = 'Frame Prep - Photon Detector Rail Installation';
    workflowTypeFormId = 'APA_Assembly';
    workflowStepIndex = [3];
  } else if (oldTypeFormId === 'g_boards') {
    newTypeFormId = 'GLayerBoardInstallation';
    newTypeFormName = 'G Layer - Board Installation';
    workflowTypeFormId = 'APA_Assembly';
    workflowStepIndex = [36];
  } else if (oldTypeFormId === 'g_solder') {
    newTypeFormId = 'GLayerSoldering';
    newTypeFormName = 'G Layer - Soldering';
    workflowTypeFormId = 'APA_Assembly';
    workflowStepIndex = [39];
  } else if (oldTypeFormId === 'g_winding') {
    newTypeFormId = 'GLayerWinding';
    newTypeFormName = 'G Layer - Winding';
    workflowTypeFormId = 'APA_Assembly';
    workflowStepIndex = [38];
  } else if (oldTypeFormId === 'g_comb_install') {
    newTypeFormId = 'GLayerWireCombInstallation';
    newTypeFormName = 'G Layer - Wire Comb Installation';
    workflowTypeFormId = 'APA_Assembly';
    workflowStepIndex = [34];
  } else if (oldTypeFormId === 'InstallationIntoASF') {
    newTypeFormId = 'InstallationIntoASFCloseUp';
    newTypeFormName = 'Installation into ASF and Close Up';
    workflowTypeFormId = 'APA_Assembly';
    workflowStepIndex = [50];
  } else if (oldTypeFormId === 'x_tension_testing') {
    newTypeFormId = 'SingleLayerTensionMeasurements';
    newTypeFormName = 'Single Layer Tension Measurements';
    workflowTypeFormId = 'APA_Assembly';
    workflowStepIndex = [13, 22, 31, 40];
  } else if (oldTypeFormId === 'u_boards') {
    newTypeFormId = 'ULayerBoardInstallation';
    newTypeFormName = 'U Layer - Board Installation';
    workflowTypeFormId = 'APA_Assembly';
    workflowStepIndex = [27];
  } else if (oldTypeFormId === 'u_solder') {
    newTypeFormId = 'ULayerSoldering';
    newTypeFormName = 'U Layer - Soldering';
    workflowTypeFormId = 'APA_Assembly';
    workflowStepIndex = [30];
  } else if (oldTypeFormId === 'u_winding') {
    newTypeFormId = 'ULayerWinding';
    newTypeFormName = 'U Layer - Winding';
    workflowTypeFormId = 'APA_Assembly';
    workflowStepIndex = [29];
  } else if (oldTypeFormId === 'u_comb_install') {
    newTypeFormId = 'ULayerWireCombInstallation';
    newTypeFormName = 'U Layer - Wire Comb Installation';
    workflowTypeFormId = 'APA_Assembly';
    workflowStepIndex = [25];
  } else if (oldTypeFormId === 'v_boards') {
    newTypeFormId = 'VLayerBoardInstallation';
    newTypeFormName = 'V Layer - Board Installation';
    workflowTypeFormId = 'APA_Assembly';
    workflowStepIndex = [18];
  } else if (oldTypeFormId === 'v_solder') {
    newTypeFormId = 'VLayerSoldering';
    newTypeFormName = 'V Layer - Soldering';
    workflowTypeFormId = 'APA_Assembly';
    workflowStepIndex = [21];
  } else if (oldTypeFormId === 'v_winding') {
    newTypeFormId = 'VLayerWinding';
    newTypeFormName = 'V Layer - Winding';
    workflowTypeFormId = 'APA_Assembly';
    workflowStepIndex = [20];
  } else if (oldTypeFormId === 'v_comb_install') {
    newTypeFormId = 'VLayerWireCombInstallation';
    newTypeFormName = 'V Layer - Wire Comb Installation';
    workflowTypeFormId = 'APA_Assembly';
    workflowStepIndex = [16];
  } else if (oldTypeFormId === 'comb_jig_removal') {
    newTypeFormId = 'SingleLayerWireCombInstallationJigRemoval';
    newTypeFormName = 'Single Layer Wire Comb Installation Jig Removal';
    workflowTypeFormId = 'APA_Assembly';
    workflowStepIndex = [17, 26, 35, 44];
  } else if (oldTypeFormId === 'x_boards') {
    newTypeFormId = 'XLayerBoardInstallation';
    newTypeFormName = 'X Layer - Board Installation';
    workflowTypeFormId = 'APA_Assembly';
    workflowStepIndex = [9];
  } else if (oldTypeFormId === 'x_solder') {
    newTypeFormId = 'XLayerSoldering';
    newTypeFormName = 'X Layer - Soldering';
    workflowTypeFormId = 'APA_Assembly';
    workflowStepIndex = [12];
  } else if (oldTypeFormId === 'x_winding') {
    newTypeFormId = 'XLayerWinding';
    newTypeFormName = 'X Layer - Winding';
    workflowTypeFormId = 'APA_Assembly';
    workflowStepIndex = [11];
  }

  const result1 = await db.collection('actions')
    .updateMany(
      { typeFormId: oldTypeFormId },
      [
        {
          $set: {
            'typeFormId': newTypeFormId,
            'typeFormName': newTypeFormName,
          }
        },
      ]
    )

  if (result1.ok === 0) throw new Error(`Admin_Functions::cleanActionTypeFormIds() - failed to change type form ID and name in the action records!`);

  for (const index of workflowStepIndex) {
    let update = { '$set': {} };
    update['$set']['path.' + index + '.formName'] = newTypeFormName;

    const result2 = await db.collection('workflows')
      .updateMany(
        { typeFormId: workflowTypeFormId },
        update,
      )

    if (result2.ok === 0) throw new Error(`Admin_Functions::cleanActionTypeFormIds() - failed to change type form name in the workflow records!`);
  }

  return newTypeFormId;
}


module.exports = {
  cleanActionTypeFormIds,
}
