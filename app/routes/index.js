const routes = [
  require('./actions'),
  require('./autocomplete'),
  require('./components'),
  require('./forms'),
  require('./search'),
  require('./start'),
  require('./workflows'),
];


module.exports = routes;


/*
  LIST OF ALL ROUTES
  This is a list of all routes declared across all files in the '/app/routes' directory
  Displaying them here in a single list will make it easier to spot any duplicated signatures, inconsistencies, etc.
  Note that all '/json/' routes listed here have an alternate '/api' route as well

  /component/:uuid
  /c/:shortuuid
  /component/:uuid/edit
  /component/:uuid/qrCodes
  /component/:uuid/batchQRCodes
  /component/:uuid/summary
  /component/:uuid/execSummary
  /component/:typeFormId/new
  /componentTypes/:typeFormId/new
  /componentTypes/:typeFormId/edit
  /componentTypes/list
  /components/list
  /components/:typeFormId/list
  /components/bulkQRCodes
  /components/bulkQRCodes/:typeFormId/:firstNumber/:lastNumber
  /json/component/:uuid
  /json/component/:typeFormId/:typeRecordNumber
  /json/component
  /json/componentBatch
  /json/newComponentUUID
  /json/confirmShortUUID/:shortuuid
  /json/components/:typeFormId/list
  /json/components/boardCounts_byPartNumberAndLocation
  /components/hwdbInformation
  /json/components/hwdbInformation/:apa1uuid/:apa2uuid

  /action/:actionId
  /action/:actionId/edit
  /action/:typeFormId/unspec
  /action/:typeFormId/spec/:uuid
  /actionTypes/:typeFormId/new
  /actionTypes/:typeFormId/edit
  /actionTypes/list
  /actions/list
  /actions/:typeFormId/list
  /json/action/:actionId
  /json/action
  /json/action/:actionId/addImages/:imageType
  /json/action/:actionId/removeImage/:imageNumber
  /json/actions/:typeFormId/list
  /json/actions/allFromWorkflow/:workflowId
  /json/actions/ncrsByComponent/:uuid
  /json/actions/boardRejectionCounts_byPartNumberAndLocation
  /actions/tensionComparisonAcrossLocations
  /json/actions/tensionComparisonAcrossLocations/:uuid/:wireLayer/:origin/:destination

  /workflow/:workflowId
  /workflow/:workflowId/edit
  /workflow/:workflowId/:stepIndex/:stepResult
  /workflow/:typeFormId/new
  /workflowTypes/:typeFormId/new
  /workflowTypes/:typeFormId/edit
  /workflowTypes/:list
  /workflows/list
  /workflows/:typeFormId/list
  /json/workflow/:workflowId
  /json/workflow
  /json/workflows/:typeFormId/list

  /json/collection/:collection/:format
  /json/collection/:collection/singleType/:typeFormId
  /json/collection/:collection/singleType/:typeFormId/edit

  /
  /user
  /json/techicians.json
  /json/meshPanelIntakeSignoff.json
  /json/frameIntakeSignoff.json
  /json/frameNCRSignoff.json
  /json/manchesterTechnicians.json
  /json/tensionControlSignoff.json
  /json/winderMaintenanceSignoff.json
  /json/uwPCBTechnicians.json
  /json/uwPCBApproval.json
  /json/uwInstallationTechnicians.json
  /json/uwInstallationApproval.json
  /json/cernComplianceOffice.json
  /json/apaShipmentReceptionSignoff.json
  /json/apaFactoryLeads.json
  /administratorUtility
  /json/administratorUtility/:inputString

  /search/componentsByIdentifier
  /json/search/componentsByDUNEPID/:dunePID
  /json/search/componentsByTypeAndNumber/:typeFormId/:typeRecordNumber
  /search/componentsByTypeAndLocation
  /json/search/componentsByTypeAndLocation/:typeFormId/:location/:toothStripStatus/:conformanceStatus/:qaChecksStatus
  /search/componentsByTypeAndPartNumber
  /json/search/componentsByTypeAndPartNumber/:typeFormId/:partNumber/:acceptanceStatus/:toothStripStatus
  /search/geoBoardsByVisInspectOrOrderNumber
  /json/search/geoBoardsByVisualInspection/:disposition/:issue
  /json/search/geoBoardsByOrderNumber/:orderNumber
  /search/boardShipmentsByReceptionDetails
  /json/search/boardShipmentsByReceptionDetails
  /json/search/boardShipmentsByBoardUUID
  /search/apasByProductionDetails
  /json/search/apasByProductionLocationAndNumber/:apaLocation/:apaNumber
  /json/search/apasByProductionLocationAndAssemblyStep/:apaLocation/:assemblyStep
  /search/actionsByIDOrReferencedUUID
  /json/search/actionsByReferencedUUID/:uuid/:actionType
  /search/nonConformanceByComponentTypeOrUUID
  /json/search/nonConformanceByComponentType/:componentType/:disposition/:status
  /json/search/nonConformanceByUUID/:uuid
  /search/workflowsByIDOrUUID
  /json/search/workflowsByUUID/:uuid

*/