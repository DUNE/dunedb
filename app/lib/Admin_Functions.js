const Binary = require('mongodb').Binary;
const MUUID = require('uuid-mongodb');

const { db } = require('./db');
const Components = require('./Components');
const logger = require('../lib/logger');
const utils = require('./utils');


async function setComponentNames(typeFormId) {
  // Retrieve a list of component UUIDs corresponding to all components with 'formId' matching the specified component type form ID
  let aggregation_stages = [];

  aggregation_stages.push({ $match: { formId: typeFormId } });
  aggregation_stages.push({ $project: { componentUuid: true } });

  let uuids = await db.collection('components')
    .aggregate(aggregation_stages)
    .toArray();

  // For each retrieved UUID ...
  for (let uuid of uuids) {
    // Get the full component record corresponding to the UUID, and construct the component name and DUNE PID
    const component = await Components.retrieve(uuid.componentUuid);
    const typeFormName = component.formName;
    const data = component.data;
    const typeRecordNumber = String(data.typeRecordNumber).padStart(5, '0');
    const validityStartDate = (typeof component.validity.startDate === 'string') ? component.validity.startDate : component.validity.startDate.toISOString();

    let componentName = '';
    let dunePid = '';

    if (typeFormId === 'APAFrame') {
      let pidSuffix = '';

      if (data.frameProductionLocation === 'dsm') {
        componentName = `APA Frame ${typeRecordNumber}-UK`;
        pidSuffix = 'UK106-010000';
      } else if (data.frameProductionLocation === 'wisconsin') {
        componentName = `APA Frame ${typeRecordNumber}-US`;
        pidSuffix = 'US200-010000';
      }

      dunePid = `D00300200001-${typeRecordNumber}-${pidSuffix}`;
    } else if (typeFormId === 'APAShippingFrame') {
      let pidSuffix = '';

      if (data.asfLocation === 'chicago') {
        componentName = `ASF ${typeRecordNumber}-US`;
        pidSuffix = 'US175-010000';
      } else if (data.asfLocation === 'daresbury') {
        componentName = `ASF ${typeRecordNumber}-UK`;
        pidSuffix = 'UK106-010000';
      } else if (data.asfLocation === 'wisconsin') {
        componentName = `ASF ${typeRecordNumber}-US`;
        pidSuffix = 'US200-010000';
      }

      dunePid = `D003MMMNNNNN-${typeRecordNumber}-${pidSuffix}`;
    } else if (typeFormId === 'AssembledAPA') {
      let pidPrefix = '';
      let pidSuffix = '';

      if (data.apaConfiguration === 'top') {
        pidPrefix = 'D00300100001';
      } else {
        pidPrefix = 'D00300100002';
      }

      if (data.apaAssemblyLocation === 'chicago') {
        componentName = `APA ${typeRecordNumber}-US`;
        pidSuffix = 'US175-010000';
      } else if (data.apaAssemblyLocation === 'daresbury') {
        componentName = `APA ${typeRecordNumber}-UK`;
        pidSuffix = 'UK106-010000';
      } else if (data.apaAssemblyLocation === 'wisconsin') {
        componentName = `APA ${typeRecordNumber}-US`;
        pidSuffix = 'US200-010000';
      }

      dunePid = `${pidPrefix}-${typeRecordNumber}-${pidSuffix}`;
    } else if (typeFormId === 'APAShipment') {
      let name_apa1 = '[not set]';
      let name_apa2 = '[not set]';

      if (data.apaUuiDs[0].component_uuid !== '') {
        const apa = await retrieve(data.apaUuiDs[0].component_uuid);
        name_apa1 = apa.data.componentName;
      }

      if (data.apaUuiDs[1].component_uuid !== '') {
        const apa = await retrieve(data.apaUuiDs[1].component_uuid);
        name_apa2 = apa.data.componentName;
      }

      componentName = `${typeFormName} (${name_apa1} and ${name_apa2})`;
      dunePid = `D003MMMNNNNN-${typeRecordNumber}-COIII-010000`;
    } else if (typeFormId === 'BoardShipment') {
      componentName = `Geometry ${typeFormName} (${data.boardUuiDs.length}.${utils.dictionary_locations[data.originOfShipment]}.${utils.dictionary_locations[data.destinationOfShipment]})`;
      dunePid = `D003MMMNNNNN-${typeRecordNumber}-COIII-010000`;
    } else if (typeFormId === 'CEAdapterBoard') {
      componentName = `${typeFormName} ${typeRecordNumber}`;
      dunePid = `D00300400003-${typeRecordNumber}-US200-010000`;
    } else if (typeFormId === 'CEAdapterBoardBatch') {
      componentName = `${typeFormName} (${data.subComponent_count}.${validityStartDate.substring(0, 10)})`;
      dunePid = `D003MMMNNNNN-${typeRecordNumber}-COIII-010000`;
    } else if (typeFormId === 'CEAdapterBoardShipment') {
      componentName = `${typeFormName} ${typeRecordNumber} (${data.boardUuiDs.length}.${validityStartDate.substring(0, 10)})`;
      dunePid = `D003MMMNNNNN-${typeRecordNumber}-COIII-010000`;
    } else if (typeFormId === 'CRBoard') {
      componentName = `${typeFormName} ${typeRecordNumber}`;
      dunePid = `D00300400001-${typeRecordNumber}-US200-010000`;
    } else if (typeFormId === 'CRBoardBatch') {
      componentName = `${typeFormName} (${data.subComponent_count}.${validityStartDate.substring(0, 10)})`;
      dunePid = `D003MMMNNNNN-${typeRecordNumber}-COIII-010000`;
    } else if (typeFormId === 'CRBoardShipment') {
      componentName = `${typeFormName} ${typeRecordNumber} (${data.boardUuiDs.length}.${validityStartDate.substring(0, 10)})`;
      dunePid = `D003MMMNNNNN-${typeRecordNumber}-COIII-010000`;
    } else if (typeFormId === 'CableHarness') {
      if (data.cableHarnessSide === 'a') {
        componentName = `${typeFormName} ${typeRecordNumber} (Side A)`;
        dunePid = `D00300500002-${typeRecordNumber}-US200-010000`;
      } else if (data.cableHarnessSide === 'b') {
        componentName = `${typeFormName} ${typeRecordNumber} (Side B)`;
        dunePid = `D00300500003-${typeRecordNumber}-US200-010000`;
      }
    } else if (typeFormId === 'CableHarnessShipment') {
      componentName = `${typeFormName} ${typeRecordNumber} (${data.boardUuiDs.length}.${validityStartDate.substring(0, 10)})`;
      dunePid = `D003MMMNNNNN-${typeRecordNumber}-COIII-010000`;
    } else if (typeFormId === 'DWA') {
      componentName = `${typeFormName} ${typeRecordNumber}`;
      dunePid = `D00300800001-${typeRecordNumber}-US136-010000`;
    } else if (typeFormId === 'DWAComponentShipment') {
      componentName = `${typeFormName} (${utils.dictionary_locations[data.originOfShipment]}.${utils.dictionary_locations[data.destinationOfShipment]})`;
      dunePid = `D003MMMNNNNN-${typeRecordNumber}-COIII-010000`;
    } else if (typeFormId === 'DWAPDB') {
      componentName = `DWA PDB ${typeRecordNumber}`;
      dunePid = `D00300800002-${typeRecordNumber}-US136-010000`;
    } else if (typeFormId === 'GBiasBoard') {
      componentName = `${typeFormName} ${typeRecordNumber}`;
      dunePid = `D00300400002-${typeRecordNumber}-US200-010000`;
    } else if (typeFormId === 'GBiasBoardBatch') {
      componentName = `${typeFormName} (${data.subComponent_count}.${validityStartDate.substring(0, 10)})`;
      dunePid = `D003MMMNNNNN-${typeRecordNumber}-COIII-010000`;
    } else if (typeFormId === 'GBiasBoardShipment') {
      componentName = `${typeFormName} ${typeRecordNumber} (${data.boardUuiDs.length}.${validityStartDate.substring(0, 10)})`;
      dunePid = `D003MMMNNNNN-${typeRecordNumber}-COIII-010000`;
    } else if (typeFormId === 'GeometryBoard') {
      componentName = `${typeFormName} ${typeRecordNumber} (${data.partString})`;
      dunePid = `D003003${utils.dictionary_geometryBoardPIDs[data.partNumber]}-${typeRecordNumber}-UK109-010000`;
    } else if (typeFormId === 'GeometryBoardBatch') {
      componentName = `${typeFormName} (${data.subComponent_count}.PN${data.subComponent_partNumber}.ON${data.orderNumber})`;
      dunePid = `D003MMMNNNNN-${typeRecordNumber}-COIII-010000`;
    } else if (typeFormId === 'GroundingMeshPanel') {
      componentName = `${typeFormName} ${typeRecordNumber}`;
      dunePid = `D00300200004-${typeRecordNumber}-UK106-010000`;
    } else if (typeFormId === 'GroundingMeshShipment') {
      componentName = `Grounding Mesh Panel Shipment (${data.apaUuiDs.length}.${utils.dictionary_locations[data.originOfShipment]}.${utils.dictionary_locations[data.destinationOfShipment]})`;
      dunePid = `D003MMMNNNNN-${typeRecordNumber}-COIII-010000`;
    } else if (typeFormId === 'PopulatedBoardShipment') {
      componentName = `Multi-Type Populated Board Shipment ${typeRecordNumber} (${utils.dictionary_locations[data.originOfShipment]}.${utils.dictionary_locations[data.destinationOfShipment]})`;
      dunePid = `D003MMMNNNNN-${typeRecordNumber}-COIII-010000`;
    } else if (typeFormId === 'ReturnedGeometryBoardBatch') {
      componentName = `${typeFormName} (${data.subComponent_count}.PN${data.subComponent_partNumber}.ON${data.orderNumber})`;
      dunePid = `D003MMMNNNNN-${typeRecordNumber}-COIII-010000`;
    } else if (typeFormId === 'SHVBoard') {
      componentName = `${typeFormName} ${typeRecordNumber}`;
      dunePid = `D00300500001-${typeRecordNumber}-US200-010000`;
    } else if (typeFormId === 'SHVBoardShipment') {
      componentName = `${typeFormName} ${typeRecordNumber} (${data.boardUuiDs.length}.${validityStartDate.substring(0, 10)})`;
      dunePid = `D003MMMNNNNN-${typeRecordNumber}-COIII-010000`;
    } else if (typeFormId === 'Yoke') {
      componentName = `${typeFormName} ${typeRecordNumber}`;
      dunePid = `D00301000001-${typeRecordNumber}-US200-010000`;
    } else if (typeFormId === 'wire_bobbin') {
      componentName = `${typeFormName} ${data.bobbinId} (Lot ${data.wireLot})`;
      dunePid = `D003MMMNNNNN-${typeRecordNumber}-COIII-010000`;
    }

    // Set up a 'matching condition' object containing the component UUID (remembering that the UUID has to be of 'MUUID' type, not a string)
    const componentUuid = component.componentUuid;
    let match_condition = { componentUuid };

    if (typeof componentUuid === 'object' && !(componentUuid instanceof Binary)) match_condition = componentUuid;

    match_condition.componentUuid = MUUID.from(match_condition.componentUuid);

    // Update the component name and DUNE PID fields of ALL records with the matching component UUID (i.e. all versions of the component in question)
    const result = await db.collection('components')
      .updateMany(
        match_condition,
        [
          {
            $set: {
              'data.componentName': componentName,
              'data.dunePid': dunePid,
            }
          },
        ]
      )

    if (result.ok === 0) throw new Error(`Admin_Functions::setComponentNames() - failed to update the component records!`);
  }

  return typeFormId;
}


async function updateComponentLocations(typeFormId) {
  // Retrieve a list of component UUIDs corresponding to all components with 'formId' matching the specified component type form ID
  let aggregation_stages = [];

  aggregation_stages.push({ $match: { formId: typeFormId } });
  aggregation_stages.push({ $project: { componentUuid: true } });

  let uuids = await db.collection('components')
    .aggregate(aggregation_stages)
    .toArray();

  // For each retrieved UUID ...
  for (let uuid of uuids) {
    // Get the full component record corresponding to the UUID
    // This will always be the latest version, and therefore contain the most recently set reception information
    const component = await Components.retrieve(uuid.componentUuid);

    if (component.reception != null) {
      // Set up a 'matching condition' object containing the component UUID (remembering that the UUID has to be of 'MUUID' type, not a string)
      const componentUuid = component.componentUuid;
      let match_condition = { componentUuid };

      if (typeof componentUuid === 'object' && !(componentUuid instanceof Binary)) match_condition = componentUuid;

      match_condition.componentUuid = MUUID.from(match_condition.componentUuid);

      // Update the reception information of ALL records with the matching component UUID (i.e. all versions of the component in question)
      const result = await db.collection('components')
        .updateMany(
          match_condition,
          [
            {
              $set: {
                'reception.location': component.reception.location,
                'reception.date': component.reception.date,
                'reception.detail': component.reception.detail,
              }
            },
          ]
        )

      if (result.ok === 0) throw new Error(`Admin_Functions::updateComponentLocations() - failed to update the component records!`);
    } else {
      logger.info(uuid.componentUuid, 'Component reception object is null!');
    }
  }

  return typeFormId;
}


async function updateComponentLocations_viaActions(actionTypeFormId) {
  // Retrieve a list of the UUIDs of all geometry boards which have had a 'Factory Board Rejection' action performed on them, and where the action's disposition is 'rejected'
  let aggregation_stages = [];

  aggregation_stages.push({
    $match: {
      'typeFormId': actionTypeFormId,
      'data.disposition': 'rejected',
    }
  });

  // Project only the fields that will be needed for the later steps
  aggregation_stages.push({
    $project: {
      'componentUuid': true,
      'data.reasonForRejectionFromInventory': true,
      'data.boardRejectionLocation': true,
      'validity': true,
    }
  });

  let uuids = await db.collection('actions')
    .aggregate(aggregation_stages)
    .toArray();

  // For each retrieved UUID ...
  for (let uuid of uuids) {
    // Get the full component record corresponding to the UUID, and check if the 'reception' object actually exists (this function will cause a full crash if not)
    const component = await Components.retrieve(uuid.componentUuid);

    if (component.reception != null) {
      // Set up a 'matching condition' object containing the component UUID (remembering that the UUID has to be of 'MUUID' type, not a string)
      const componentUuid = component.componentUuid;
      let match_condition = { componentUuid };

      if (typeof componentUuid === 'object' && !(componentUuid instanceof Binary)) match_condition = componentUuid;

      match_condition.componentUuid = MUUID.from(match_condition.componentUuid);

      // Set the desired reception information:
      // - location = 'rejected'
      // - date = the date on which the Factory Board Rejection action was performed (or last edited)
      // - detail = a string containing some additional information about why the board was rejected
      const newBoardLocation = 'rejected';
      const rejectionLocation = utils.dictionary_locations[uuid.data.boardRejectionLocation]
      const rejectionDate = uuid.validity.startDate.toISOString().slice(0, 10);
      let rejectionReason = '';

      if (uuid.data.reasonForRejectionFromInventory.step) { rejectionReason = 'Step Failure' }
      else if (uuid.data.reasonForRejectionFromInventory.solderMaskScratch) { rejectionReason = 'Solder Mask Scratch' }
      else if (uuid.data.reasonForRejectionFromInventory.scratchInCopperTrace) { rejectionReason = 'Copper Trace Scratch' }
      else if (uuid.data.reasonForRejectionFromInventory.brokenTooth) { rejectionReason = 'Broken Tooth' }
      else if (uuid.data.reasonForRejectionFromInventory.delaminationOfLayers) { rejectionReason = 'Delamination of Layers' }
      else if (uuid.data.reasonForRejectionFromInventory.bentPins) { rejectionReason = 'Bent Pins' }
      else if (uuid.data.reasonForRejectionFromInventory.epoxyOnSolderPadsOrToothStrip) { rejectionReason = 'Misplaced Epoxy' }
      else if (uuid.data.reasonForRejectionFromInventory.toothStripNotProperlyAttached) { rejectionReason = 'Misattached Tooth Strip' }
      else if (uuid.data.reasonForRejectionFromInventory.qrCodeIssue) { rejectionReason = 'QR Code Issue' }
      else if (uuid.data.reasonForRejectionFromInventory.installationCausedDamage) { rejectionReason = 'Installation Damage' }
      else if (uuid.data.reasonForRejectionFromInventory.other) { rejectionReason = 'Unspecified Reason' }

      const rejectionDetail = `[${rejectionLocation} - ${rejectionReason}]`;

      // Update the reception information of ALL records with the matching component UUID (i.e. all versions of the component in question)
      const result = await db.collection('components')
        .updateMany(
          match_condition,
          [
            {
              $set: {
                'reception.location': newBoardLocation,
                'reception.date': rejectionDate,
                'reception.detail': rejectionDetail,
              }
            },
          ]
        )

      if (result.ok === 0) throw new Error(`Admin_Functions::updateComponentLocations_viaActions() - failed to update the component records!`);
    } else {
      logger.info(uuid.componentUuid, 'Component reception object is null!');
    }
  }

  return actionTypeFormId;
}


module.exports = {
  setComponentNames,
  updateComponentLocations,
  updateComponentLocations_viaActions,
}
