const MUUID = require('uuid-mongodb');

const Actions = require('./Actions');
const { db } = require('./db');
const Components = require('./Components');
const Forms = require('./Forms');
const logger = require('./logger');
const utils = require('./utils');


async function cleanComponentRecords(typeFormId) {
  let deleteCondition = null;

  if (typeFormId === 'ALL_COMPONENTS') {
    deleteCondition = { $unset: { 'data.name': "" } };
  } else if (typeFormId === 'APAFrame') {
    deleteCondition = { $unset: { 'data.frameNumber': "" } };
  } else if (typeFormId === 'AssembledAPA') {
    deleteCondition = { $unset: { 'data.apaNumberAtLocation': "" } };
  } else if (typeFormId === 'DWA') {
    deleteCondition = { $unset: { 'data.dwaNumber': "" } };
  } else if (typeFormId === 'DWAPDB') {
    deleteCondition = { $unset: { 'data.pdbNumber': "" } };
  }

  const matchCondition = (typeFormId === 'ALL_COMPONENTS') ? {} : { formId: typeFormId };

  const result = await db.collection('components')
    .updateMany(
      matchCondition,
      deleteCondition,
    )

  if (result.ok === 0) throw new Error(`Admin_Functions::cleanComponentRecords() - failed to delete fields from the component records!`);

  return typeFormId;
}


async function addComponentInfoToActionRecords(componentType) {
  const apaFramesAndShipments = ['DeliveredFrameQAChecks', 'CompletedFrameQCChecklist', 'InstallationSurveys', 'IntakeSurveys', 'APAShipmentReception', 'APAShipmentTransport', 'ASFCloseUp'];
  let assembledAPAs = [];

  const apaWorkflowTypeForm = await Forms.retrieve('workflowForms', 'APA_Assembly');
  let actionTypeForms = await Forms.list('actionForms');
  let list_apaWorkflowActionNames = [];

  for (const step of apaWorkflowTypeForm.path.slice(1)) {
    list_apaWorkflowActionNames.push(step.formName);
  }

  for (const [typeFormID, typeForm] of Object.entries(actionTypeForms)) {
    if (list_apaWorkflowActionNames.includes(typeForm.formName)) {
      assembledAPAs.push(typeFormID);
    }
  }

  const geometryBoards = ['BoardToothStripAttachment', 'BoardVisualInspection', 'FactoryBoardRejection'];
  const groundingMeshPanels = ['EpoxyApplication', 'FinalInspection', 'MeshQAInspection', 'APANonConformance', 'ReceiptInspection'];

  const combined = apaFramesAndShipments.concat(assembledAPAs, geometryBoards, groundingMeshPanels);
  let otherComponents = [];

  for (const [typeFormID, typeForm] of Object.entries(actionTypeForms)) {
    if (!(combined.includes(typeFormID)) && !(typeForm.tags.includes('Trash'))) {
      otherComponents.push(typeFormID);
    }
  }

  let filterCondition = null;

  if (componentType === 'APAFramesAndShipments') {
    filterCondition = { 'typeFormId': { $in: apaFramesAndShipments } }
  } else if (componentType === 'AssembledAPAs') {
    filterCondition = { 'typeFormId': { $in: assembledAPAs } }
  } else if (componentType === 'GeometryBoards_BoardToothStripAttachment') {
    filterCondition = { 'typeFormId': 'BoardToothStripAttachment' }
  } else if (componentType === 'GeometryBoards_BoardVisualInspection') {
    filterCondition = { 'typeFormId': 'BoardVisualInspection' }
  } else if (componentType === 'GeometryBoards_FactoryBoardRejection') {
    filterCondition = { 'typeFormId': 'FactoryBoardRejection' }
  } else if (componentType === 'GroundingMeshPanels') {
    filterCondition = { 'typeFormId': { $in: groundingMeshPanels } }
  } else if (componentType === 'OtherComponents') {
    filterCondition = { 'typeFormId': { $in: otherComponents } }
  }

  const result = await db.collection('actions')
    .find(filterCondition)
    .forEach(async function (actionRecord) {
      const componentRecord = await Components.retrieve(actionRecord.componentUuid);
      const componentName = (componentRecord) ? componentRecord.data.componentName : '[no component record found!]';
      const componentTypeFormId = (componentRecord) ? componentRecord.formId : '[no component record found!]';
      const componentTypeFormName = (componentRecord) ? componentRecord.formName : '[no component record found!]';

      const innerResult = db.collection('actions')
        .updateOne(
          { _id: actionRecord._id },
          {
            $set: {
              'componentName': componentName,
              'componentTypeFormId': componentTypeFormId,
              'componentTypeFormName': componentTypeFormName,
            }
          },
        );

    });

  return 'ALL_ACTIONS';
}

module.exports = {
  cleanComponentRecords,
  addComponentInfoToActionRecords,
}
