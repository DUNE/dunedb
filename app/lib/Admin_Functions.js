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

  if (oldTypeFormId === 'CEAdapterBoardReception') {
    newTypeFormId = 'CEAdapterBoardShipmentReception';
    newTypeFormName = 'CE Adapter Board Shipment Reception';
  } else if (oldTypeFormId === 'CEAdapterBoardTransport') {
    newTypeFormId = 'CEAdapterBoardShipmentTransport';
    newTypeFormName = 'CE Adapter Board Shipment Transport';
  } else if (oldTypeFormId === 'BoardToothStripAttachment') {
    newTypeFormId = 'GeometryBoardToothStripAttachment';
    newTypeFormName = 'Geometry Board Tooth Strip Attachment';
  } else if (oldTypeFormId === 'BoardVisualInspection') {
    newTypeFormId = 'GeometryBoardVisualInspection';
    newTypeFormName = 'Geometry Board Visual Inspection';
  } else if (oldTypeFormId === 'FactoryBoardRejection') {
    newTypeFormId = 'GeometryBoardRejection';
    newTypeFormName = 'Geometry Board Rejection';
  } else if (oldTypeFormId === 'BoardReception') {
    newTypeFormId = 'GeometryBoardShipmentReception';
    newTypeFormName = 'Geometry Board Shipment Reception';
  } else if (oldTypeFormId === 'GeometyBoardShipmentTrackingInfo') {
    newTypeFormId = 'GeometryBoardShipmentTrackingInfo';
    newTypeFormName = 'Geometry Board Shipment Tracking Info';
  } else if (oldTypeFormId === 'EpoxyApplication') {
    newTypeFormId = 'GroundingMeshPanelEpoxyApplication';
    newTypeFormName = 'Grounding Mesh Panel Epoxy Application';
  } else if (oldTypeFormId === 'FinalInspection') {
    newTypeFormId = 'GroundingMeshPanelFinalInspection';
    newTypeFormName = 'Grounding Mesh Panel Final Inspection';
  } else if (oldTypeFormId === 'MeshQAInspection') {
    newTypeFormId = 'GroundingMeshPanelQAInspection';
    newTypeFormName = 'Grounding Mesh Panel QA Inspection';
  } else if (oldTypeFormId === 'ReceiptInspection') {
    newTypeFormId = 'GroundingMeshPanelReceiptInspection';
    newTypeFormName = 'Grounding Mesh Panel Receipt Inspection';
  } else if (oldTypeFormId === 'GroundingMeshShipmentReception') {
    newTypeFormId = 'GroundingMeshPanelShipmentReception';
    newTypeFormName = 'Grounding Mesh Panel Shipment Reception';
  } else if (oldTypeFormId === 'PopulatedBoardQC') {
    newTypeFormId = 'PopulatedBoardCableHarnessQA';
    newTypeFormName = 'Populated Board/Cable Harness QA';
  } else if (oldTypeFormId === 'APANonConformance') {
    newTypeFormId = 'NonConformanceReport';
    newTypeFormName = 'Non-Conformance Report';
  } else if (oldTypeFormId === 'PopulatedBoardKitReception') {
    newTypeFormId = 'MultiTypePopulatedBoardShipmentReception';
    newTypeFormName = 'Multi-Type Populated Board Shipment Reception';
  }

  const result = await db.collection('actions')
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

  if (result.ok === 0) throw new Error(`Admin_Functions::cleanActionTypeFormIds() - failed to change type form ID and name in the action records!`);

  return newTypeFormId;
}


module.exports = {
  cleanActionTypeFormIds,
}
