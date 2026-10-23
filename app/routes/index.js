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
  /json/component
  /json/componentBatch
  /json/newComponentUUID
  /json/confirmShortUUID/:shortuuid
  /json/components/:typeFormId/list
  /json/components/boardCounts_byPartNumberAndLocation
  /components/hwdbInformation
  /json/components/hwdbInformation/:uuid

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
  /actions/qaParameterComparisonAcrossAPAs
  /json/actions/qaParameterComparisonAcrossAPAs/:qaParameter

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
  /json/techicians_current.json
  /json/frameIntakeSignoff.json
  /json/frameIntakeSignoff_current.json
  /json/frameNCRSignoff.json
  /json/frameNCRSignoff_current.json
  /json/dBandFramePrep.json
  /json/dBandFramePrep_current.json
  /json/tensionControlSignoff.json
  /json/tensionControlSignoff_current.json
  /json/winderMaintenanceSignoff.json
  /json/winderMaintenanceSignoff_current.json
  /json/dBandWinding.json
  /json/dBandWinding_current.json
  /json/dBandPostProduction.json
  /json/dBandPostProduction_current.json
  /json/dBandConduitInsertion.json
  /json/dBandConduitInsertion_current.json
  /json/fdhdTechCoordSignoff.json
  /json/fdhdTechCoordSignoff_current.json
  /json/apaShipmentPostReceptionSignoff.json
  /json/apaShipmentPostReceptionSignoff_current.json
  /json/apaFactoryLeads.json
  /json/apaFactoryLeads_current.json
  /json/yokeSignoff.json
  /json/yokeSignoff.json
  /json/populatedBoardShipmentSignoff.json
  /json/populatedBoardShipmentSignoff_current.json
  /json/apaColdTestSignoff.json
  /json/apaColdTestSignoff_current.json
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
  /search/geoBoardShipmentsByReceptionDetails
  /json/search/geoBoardShipmentsByReceptionDetails
  /json/search/geoBoardShipmentsByBoardUUID
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