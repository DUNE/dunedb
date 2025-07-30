const router = require('express').Router();
const MUUID = require('uuid-mongodb');
const ShortUUID = require('short-uuid');

const Actions = require('../lib/Actions');
const Components = require('../lib/Components');
const Components_ExecSummary = require('../lib/Components_ExecSummary');
const Forms = require('../lib/Forms');
const logger = require('../lib/logger');
const permissions = require('../lib/permissions');
const Search_GeoBoards = require('../lib/Search_GeoBoards');
const Search_OtherComponents = require('../lib/Search_OtherComponents');
const utils = require('../lib/utils');
const Workflows = require('../lib/Workflows');


/// Retrieve an existing component record
router.get('/component/:uuid', permissions.checkPermission('components:view'), async function (req, res, next) {
  try {
    // Set up a query object consisting of the specified component UUID and a version number if one is provided (if not, the most recent version is assumed)
    let query = { componentUuid: req.params.uuid };

    if (req.query.version) query['validity.version'] = parseInt(req.query.version, 10);

    // Simultaneously retrieve the specified version and all versions of the record, and throw an error if there is no record corresponding to the component UUID
    const [component, componentVersions] = await Promise.all([
      Components.retrieve(query),
      Components.versions(req.params.uuid),
    ]);

    if (!component) return res.status(404).send(`There is no component record with component UUID = ${req.params.uuid}`);

    // Retrieve other information relating to this component:
    //  - the component type form corresponding to the type form ID in the component record (and throw an error if there is no such type form)
    //  - records of all actions that have already been performed on this component
    //  - all currently available action type forms
    let [componentTypeForm, actions, actionTypeForms] = await Promise.all([
      Forms.retrieve('componentForms', component.formId),
      Actions.list({ componentUuid: req.params.uuid }),
      Forms.list('actionForms'),
    ]);

    if (!componentTypeForm) return res.status(404).send(`There is no component type form with form ID = ${component.formId}`);

    // Extract the most recently performed / edited action from the list of all actions above
    // This should be done explicitly here, since that list could be modified below depending on the component's type
    const mostRecentAction = (actions.length > 0) ? actions[0] : null;

    // If the specified component is a 'Geometry Board' type, retrieve some more detailed information about any shipments that the board has been part of
    // Add this information to the previously retrieved list of actions performed on the board, and make sure that all of the action entries contain the same (or equivalent) fields
    // Add an entry for the board itself (again, containing the same fields as the action entries), and finally sort all entries in the combined array by the 'lastEditDate' field
    if (component.formId === 'GeometryBoard') {
      boardShipments = await Search_OtherComponents.boardShipmentsByBoardUUID(req.params.uuid);
      actions = actions.concat(boardShipments);

      for (let entry of actions) {
        if (entry.typeFormId !== 'BoardShipment') {
          entry.data = {};
          entry.data.checksPassed = 'No';

          const record = await Actions.retrieve(entry.actionId);

          if (entry.typeFormId === 'BoardVisualInspection') {
            entry.data.originOfShipment = 'lancaster';

            if ((record.data.nonConformingDisposition === 'boardIsConformant') || (record.data.nonConformingDisposition === 'useAsIs')) {
              entry.data.checksPassed = 'Yes';
            }
          } else if (entry.typeFormId === 'BoardToothStripAttachment') {
            entry.data.originOfShipment = record.data.locationWorkPerformed;

            if ((record.data.qcBoardDamage === 'no') && (record.data.qcGapWithBoard === 'no') && (record.data.qcToothStripDamage === 'no') && (record.data.qcStripFlushWithBoard === 'yes') && (record.data.qcCorrectEpoxyApplication === 'yes') && (record.data.qcSolderPadAlignment === 'yes')) {
              entry.data.checksPassed = 'Yes';
            }
          } else if (entry.typeFormId === 'BoardMetrology') {
            entry.data.originOfShipment = record.data.location;

            if ((record.data.featurePositionChecks === 'passed') && (record.data.boardThicknessCheck === 'passed')) {
              entry.data.checksPassed = 'Yes';
            }
          } else if (entry.typeFormId === 'FactoryBoardRejection') {
            entry.data.originOfShipment = record.data.boardRejectionLocation;

            if ((record.data.disposition === 'remediated') || (record.data.disposition === 'useAsIs')) {
              entry.data.checksPassed = 'Yes';
            }
          }
        }
      }

      actions.push({
        'typeFormName': 'Board DB Record Created',
        'componentUuid': req.params.uuid,
        'lastEditDate': new Date(componentVersions[componentVersions.length - 1].validity.startDate),
        'data': { 'originOfShipment': 'lancaster' },
      });

      actions.sort(utils.byField_increasing('lastEditDate'));
    }

    // Set a variable to indicate if the specified component type is one that is the subject of a workflow
    // First set up a list of component type form IDs for all components that are the subject of any workflow (there are only two workflow types, so we can do this explicitly)
    // Then check to see if the list of component type form IDs includes the type form ID of the component type being specified
    const list_workflowComponents = ['AssembledAPA', 'APAFrame', 'APAShipment'];
    const workflowComponent = list_workflowComponents.includes(component.formId);

    // If the specified component type is one that is the subject of a workflow, filter out any action types that should be performed through the workflow
    // First, retrieve the workflow type form, and then build an array of the workflow's action type form names from its path steps
    // Finally loop through the dictionary of all currently available action type forms, and remove those whose type form name appears in the array of workflow action type form names
    // Then create a list of only the non-workflow actions that have already been performed on the component, using the same array of workflow action type form names from above
    // For component types that are not the subject of a workflow, the list of action types remains unchanged, and the list of non-workflow actions is the same as the overall list retrieved above
    let nonWorkflowActions = [];

    if (workflowComponent) {
      let workflowTypeForm = null;

      if (component.formId === 'AssembledAPA') {
        workflowTypeForm = await Forms.retrieve('workflowForms', 'APA_Assembly');
      } else if (component.formId === 'APAFrame') {
        workflowTypeForm = await Forms.retrieve('workflowForms', 'FrameAssembly');
      } else if (component.formId === 'APAShipment') {
        workflowTypeForm = await Forms.retrieve('workflowForms', 'APA_PostProduction');
      }

      const list_workflowActions = [];

      if (workflowTypeForm) {
        for (const step of workflowTypeForm.path.slice(1)) {
          list_workflowActions.push(step.formName);
        }
      }

      for (const [typeFormID, typeForm] of Object.entries(actionTypeForms)) {
        if (list_workflowActions.includes(typeForm.formName)) {
          delete actionTypeForms[typeFormID];
        }
      }

      for (const action of actions) {
        if (!(list_workflowActions.includes(action.typeFormName))) nonWorkflowActions.push(action);
      }
    } else {
      nonWorkflowActions = actions;
    }

    // Most shipment and batch type components only hold very basic information (i.e. only the full UUIDs) about the individual sub-components that they contain
    // (The exceptions to this are 'XXX Board Batch' type components, which naturally contain the full UUIDs, short UUIDs and UKIDs/UWIDs of all boards in each one)
    // For the other shipment and batch component types, set up an array containing more detailed information about each sub-component
    let collectionDetails = [];

    if (component.formId === 'BoardShipment') {
      for (const info of component.data.boardUuiDs) {
        let uuid = info.component_uuid;

        if (uuid !== '') {
          const boardRecord = await Components.retrieve(uuid);

          if (boardRecord) collectionDetails.push([uuid, boardRecord.data.typeRecordNumber, boardRecord.data.partNumber, boardRecord.shortUuid]);
        }
      }
    }

    if ((component.formId === 'CEAdapterBoardShipment') || (component.formId === 'CRBoardShipment') || (component.formId === 'CableHarnessShipment') || (component.formId === 'GBiasBoardShipment') || (component.formId === 'SHVBoardShipment')) {
      for (const info of component.data.boardUuiDs) {
        let uuid = info.component_uuid;

        if (uuid !== '') {
          const boardRecord = await Components.retrieve(uuid);

          if (boardRecord) collectionDetails.push([uuid, boardRecord.data.typeRecordNumber, boardRecord.formName, boardRecord.shortUuid]);
        }
      }
    }

    if (component.formId === 'DWAComponentShipment') {
      for (const info of component.data.componentUUIDs) {
        let uuid = info.component_uuid;

        if (uuid !== '') {
          const dwaRecord = await Components.retrieve(uuid);

          if (dwaRecord) collectionDetails.push([uuid, dwaRecord.data.typeRecordNumber, dwaRecord.formName, dwaRecord.shortUuid]);
        }
      }
    }

    if (component.formId === 'GroundingMeshShipment') {
      for (const info of component.data.apaUuiDs) {
        let uuid = info.component_uuid;

        if (uuid !== '') {
          const meshRecord = await Components.retrieve(uuid);

          if (meshRecord) collectionDetails.push([uuid, meshRecord.data.typeRecordNumber, meshRecord.data.meshPanelPartNumber, meshRecord.shortUuid]);
        }
      }
    }

    if (component.formId === 'PopulatedBoardShipment') {
      for (const info of component.data.crBoardKitUuiDs) {
        let uuid = info.component_uuid;

        if (uuid !== '') {
          const componentRecord = await Components.retrieve(uuid);

          if (componentRecord) collectionDetails.push([uuid, componentRecord.formName, componentRecord.shortUuid]);
        }
      }

      for (const info of component.data.gBiasBoardKitUuiDs) {
        let uuid = info.component_uuid;

        if (uuid !== '') {
          const componentRecord = await Components.retrieve(uuid);

          if (componentRecord) collectionDetails.push([uuid, componentRecord.formName, componentRecord.shortUuid]);
        }
      }

      for (const info of component.data.shvBoardKitUuiDs) {
        let uuid = info.component_uuid;

        if (uuid !== '') {
          const componentRecord = await Components.retrieve(uuid);

          if (componentRecord) collectionDetails.push([uuid, componentRecord.formName, componentRecord.shortUuid]);
        }
      }

      for (const info of component.data.cableHarnessKitUuiDs) {
        let uuid = info.component_uuid;

        if (uuid !== '') {
          const componentRecord = await Components.retrieve(uuid);

          if (componentRecord) collectionDetails.push([uuid, componentRecord.formName, componentRecord.shortUuid]);
        }
      }
    }

    if (component.formId === 'ReturnedGeometryBoardBatch') {
      for (const info of component.data.boardUuids) {
        let uuid = info.component_uuid;

        if (uuid !== '') {
          const boardRecord = await Components.retrieve(uuid);

          if (boardRecord) collectionDetails.push([uuid, boardRecord.data.typeRecordNumber, boardRecord.shortUuid]);
        }
      }
    }

    // If the specified component is an 'Assembled APA' type, retrieve some more detailed information about any geometry boards that have been installed on it
    let installedGeometryBoards = [];
    let installedGeometryBoardsCount = 0;

    if (component.formId === 'AssembledAPA') {
      installedGeometryBoards = await Search_GeoBoards.boardsByAPA(req.params.uuid);

      for (const boardGroup of installedGeometryBoards) {
        installedGeometryBoardsCount += boardGroup.componentUuids.length;
      }
    }

    // Render the interface page
    res.render('component.pug', {
      component,
      componentVersions,
      componentTypeForm,
      collectionDetails,
      installedGeometryBoards,
      installedGeometryBoardsCount,
      actions: nonWorkflowActions,
      mostRecentAction,
      actionTypeForms,
      dictionary_queries: req.query,
      dictionary_locations: utils.dictionary_locations,
      workflowComponent,
    });
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// Redirect a shortened component record page URL (used by a component's QR code) to the full URL
router.get('/c/:shortuuid', async function (req, res, next) {
  try {
    // Reconstruct the full UUID from the shortened UUID
    const componentUuid = ShortUUID().toUUID(req.params.shortuuid);

    // Redirect the user to the interface page for viewing a component record
    res.redirect(302, `/component/${componentUuid}`);
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// Edit an existing component record
router.get('/component/:uuid/edit', permissions.checkPermission('components:edit'), async function (req, res, next) {
  try {
    // Retrieve the most recent version of the record corresponding to the specified component UUID, and throw an error if there is no such record
    const component = await Components.retrieve(req.params.uuid);

    if (!component) return res.status(404).send(`There is no component record with component UUID = ${req.params.uuid}`);

    // Retrieve the component type form corresponding to the type form ID in the component record, and throw an error if there is no such type form
    const componentTypeForm = await Forms.retrieve('componentForms', component.formId);

    if (!componentTypeForm) return res.status(404).send(`There is no component type form with form ID = ${component.formId}`);

    // Render the interface page
    res.render('component_edit.pug', {
      component,
      componentTypeForm,
      subComponent_fullUuids: [],
      subComponent_shortUuids: [],
      componentCounts_byType: [],
      workflowId: '',
    });
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// View and print a single component's QR codes
router.get('/component/:uuid/qrCodes', permissions.checkPermission('components:view'), async function (req, res, next) {
  try {
    // Retrieve the most recent version of the record corresponding to the specified component UUID, and throw an error if there is no such record
    const component = await Components.retrieve(req.params.uuid);

    if (!component) return res.status(404).send(`There is no component record with component UUID = ${req.params.uuid}`);

    // Render the interface page
    res.render('component_qrCodes.pug', { component });
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// View and print the QR codes of all sub-components in a single shipment- or batch-type component
router.get('/component/:uuid/batchQRCodes', permissions.checkPermission('components:view'), async function (req, res, next) {
  try {
    // Retrieve the most recent version of the record corresponding to the specified component UUID, and throw an error if there is no such record
    const component = await Components.retrieve(req.params.uuid);

    if (!component) return res.status(404).send(`There is no component record with component UUID = ${req.params.uuid}`);

    // Set up and populate a list of the sub-components' shortened UUIDs (plus some useful information to display alongside the sub-component QR codes)
    // For shipment-type components, the shortened UUIDs will need to be retrieved from the individual sub-component records (since they are not saved in the shipment compnent's own record)...
    // ... but for batch-type components, they are already saved in the batch component's own record, so the individual sub-component records are not needed
    let shortUUIDs = [];

    if ((component.formId === 'BoardShipment') || (component.formId === 'CEAdapterBoardShipment') || (component.formId === 'CRBoardShipment') || (component.formId === 'CableHarnessShipment') || (component.formId === 'GBiasBoardShipment') || (component.formId === 'SHVBoardShipment')) {
      for (const info of component.data.boardUuiDs) {
        let uuid = info.component_uuid;

        if (uuid !== '') {
          const boardRecord = await Components.retrieve(uuid);

          if (boardRecord) shortUUIDs.push([boardRecord.data.typeRecordNumber, boardRecord.shortUuid, boardRecord.formName]);
        }
      }
    }

    if (component.formId === 'DWAComponentShipment') {
      for (const info of component.data.componentUUIDs) {
        let uuid = info.component_uuid;

        if (uuid !== '') {
          const dwaRecord = await Components.retrieve(uuid);

          if (dwaRecord) shortUUIDs.push([dwaRecord.data.typeRecordNumber, dwaRecord.shortUuid, dwaRecord.formName]);
        }
      }
    }

    if (component.formId === 'GroundingMeshShipment') {
      for (const info of component.data.apaUuiDs) {
        let uuid = info.component_uuid;

        if (uuid !== '') {
          const meshRecord = await Components.retrieve(uuid);

          if (meshRecord) shortUUIDs.push([meshRecord.data.typeRecordNumber, meshRecord.shortUuid, meshRecord.formName]);
        }
      }
    }

    if (component.formId === 'PopulatedBoardShipment') {
      for (const info of component.data.crBoardKitUuiDs) {
        let uuid = info.component_uuid;

        if (uuid !== '') {
          const componentRecord = await Components.retrieve(uuid);

          if (componentRecord) shortUUIDs.push([componentRecord.data.typeRecordNumber, componentRecord.shortUuid, componentRecord.formName]);
        }
      }

      for (const info of component.data.gBiasBoardKitUuiDs) {
        let uuid = info.component_uuid;

        if (uuid !== '') {
          const componentRecord = await Components.retrieve(uuid);

          if (componentRecord) shortUUIDs.push([componentRecord.data.typeRecordNumber, componentRecord.shortUuid, componentRecord.formName]);
        }
      }

      for (const info of component.data.shvBoardKitUuiDs) {
        let uuid = info.component_uuid;

        if (uuid !== '') {
          const componentRecord = await Components.retrieve(uuid);

          if (componentRecord) shortUUIDs.push([componentRecord.data.typeRecordNumber, componentRecord.shortUuid, componentRecord.formName]);
        }
      }

      for (const info of component.data.cableHarnessKitUuiDs) {
        let uuid = info.component_uuid;

        if (uuid !== '') {
          const componentRecord = await Components.retrieve(uuid);

          if (componentRecord) shortUUIDs.push([componentRecord.data.typeRecordNumber, componentRecord.shortUuid, componentRecord.formName]);
        }
      }
    }

    if (component.formId === 'CEAdapterBoardBatch' || component.formId === 'CRBoardBatch' || component.formId === 'GBiasBoardBatch' || component.formId === 'GeometryBoardBatch') {
      for (const uuid of component.data.subComponent_fullUuids) {
        if (uuid !== '') {
          const componentRecord = await Components.retrieve(uuid);

          if (componentRecord) shortUUIDs.push([componentRecord.data.typeRecordNumber, componentRecord.shortUuid, componentRecord.formName]);
        }
      }
    }

    // Render the interface page
    res.render('component_bulkQRCodeViewer.pug', { shortUUIDs });
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// View and print a single component's summary
router.get('/component/:uuid/summary', permissions.checkPermission('components:view'), async function (req, res, next) {
  try {
    // Retrieve the most recent version of the record corresponding to the specified component UUID, and throw an error if there is no such record
    const component = await Components.retrieve({ componentUuid: req.params.uuid });

    if (!component) return res.status(404).send(`There is no component record with component UUID = ${req.params.uuid}`);

    // Retrieve other information relating to this component:
    //  - the component type form corresponding to the type form ID in the component record (and throw an error if there is no such type form)
    //  - records of all actions that have already been performed on this component
    const [componentTypeForm, actions] = await Promise.all([
      Forms.retrieve('componentForms', component.formId),
      Actions.list({ componentUuid: req.params.uuid }),
    ]);

    if (!componentTypeForm) return res.status(404).send(`There is no component type form with form ID = ${component.formId}`);

    // We would like the actions to be ordered in a specific way in the summary document, to make it easier to find any given action (particularly when there are a lot of actions):
    //   - first, all non-conformance actions in chronological order (earliest to latest)
    //   - then, all workflow actions in order of the workflow
    //   - and finally, any other actions in chronological order

    // First deal with the non-workflow actions
    // Loop through the action records, and select only the non-workflow actions - i.e. those which do NOT have a 'workflowID' field
    // For each such action, retrieve the entire action record (since the list retrieved previously contains only the bare minimum of information), and save it into the appropriate array based on the action type form
    // Finally, reverse the separated arrays of non-workflow actions to get the actions in chronological order (they are natively retrieved in reverse chronological order (i.e. latest to earliest))
    let nonConformActions = [];
    let otherActions = [];

    for (let i = 0; i < actions.length; i++) {
      if (actions[i].workflowId == null) {
        if (actions[i].typeFormId === 'APANonConformance') {
          nonConformActions.push(await Actions.retrieve({ actionId: actions[i].actionId }));
        } else {
          otherActions.push(await Actions.retrieve({ actionId: actions[i].actionId }));
        }
      }
    }

    const chrono_nonConformActions = nonConformActions.reverse();
    const chrono_otherActions = otherActions.reverse();

    // Now deal with any workflow actions (only relevant if the component has a workflow ID)
    let workflowActions = [];

    if (component.workflowId != null) {
      // Retrieve the most recent version of the record corresponding to the specified workflow ID
      const workflow = await Workflows.retrieve(component.workflowId);

      // Loop over the action steps in the workflow path, and for each one that has a 'result' (i.e. an action has actually been performed), retrieve and save the full action record
      for (let stepIndex = 1; stepIndex < workflow.path.length; stepIndex++) {
        if (workflow.path[stepIndex].result.length > 0) {
          workflowActions.push(await Actions.retrieve(workflow.path[stepIndex].result));
        }
      }
    }

    // For specific shipment and batch component types, set up an array containing more detailed information about each sub-component
    let collectionDetails = [];

    if (component.formId === 'BoardShipment') {
      for (const info of component.data.boardUuiDs) {
        let uuid = info.component_uuid;

        if (uuid !== '') {
          const boardRecord = await Components.retrieve(uuid);

          if (boardRecord) collectionDetails.push([uuid, boardRecord.data.typeRecordNumber, boardRecord.data.partNumber]);
        }
      }
    }

    if ((component.formId === 'CEAdapterBoardShipment') || (component.formId === 'CRBoardShipment') || (component.formId === 'CableHarnessShipment') || (component.formId === 'GBiasBoardShipment') || (component.formId === 'SHVBoardShipment')) {
      for (const info of component.data.boardUuiDs) {
        let uuid = info.component_uuid;

        if (uuid !== '') {
          const boardRecord = await Components.retrieve(uuid);

          if (boardRecord) collectionDetails.push([uuid, boardRecord.data.typeRecordNumber, boardRecord.formName]);
        }
      }
    }

    if (component.formId === 'DWAComponentShipment') {
      for (const info of component.data.componentUUIDs) {
        let uuid = info.component_uuid;

        if (uuid !== '') {
          const dwaRecord = await Components.retrieve(uuid);

          if (dwaRecord) collectionDetails.push([uuid, dwaRecord.data.typeRecordNumber, dwaRecord.formName]);
        }
      }
    }

    if (component.formId === 'GroundingMeshShipment') {
      for (const info of component.data.apaUuiDs) {
        let uuid = info.component_uuid;

        if (uuid !== '') {
          const meshRecord = await Components.retrieve(uuid);

          if (meshRecord) collectionDetails.push([uuid, meshRecord.data.typeRecordNumber, meshRecord.data.meshPanelPartNumber]);
        }
      }
    }

    if (component.formId === 'PopulatedBoardShipment') {
      for (const info of component.data.crBoardKitUuiDs) {
        let uuid = info.component_uuid;

        if (uuid !== '') {
          const componentRecord = await Components.retrieve(uuid);

          if (componentRecord) collectionDetails.push([uuid, componentRecord.data.typeRecordNumber, componentRecord.formName]);
        }
      }

      for (const info of component.data.gBiasBoardKitUuiDs) {
        let uuid = info.component_uuid;

        if (uuid !== '') {
          const componentRecord = await Components.retrieve(uuid);

          if (componentRecord) collectionDetails.push([uuid, componentRecord.data.typeRecordNumber, componentRecord.formName]);
        }
      }

      for (const info of component.data.shvBoardKitUuiDs) {
        let uuid = info.component_uuid;

        if (uuid !== '') {
          const componentRecord = await Components.retrieve(uuid);

          if (componentRecord) collectionDetails.push([uuid, componentRecord.data.typeRecordNumber, componentRecord.formName]);
        }
      }

      for (const info of component.data.cableHarnessKitUuiDs) {
        let uuid = info.component_uuid;

        if (uuid !== '') {
          const componentRecord = await Components.retrieve(uuid);

          if (componentRecord) collectionDetails.push([uuid, componentRecord.data.typeRecordNumber, componentRecord.formName]);
        }
      }
    }

    // Render the interface page
    res.render('component_summary.pug', {
      component,
      componentTypeForm,
      collectionDetails,
      nonConformActions: chrono_nonConformActions,
      workflowActions,
      otherActions: chrono_otherActions,
      dictionary_locations: utils.dictionary_locations,
    });
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// View and print an assembled APA's executive summary
/// Note that this is different from an assembled APA's more general component summary, and executive summaries are only generated for assembled APAs 
router.get('/component/:uuid/execSummary', permissions.checkPermission('components:view'), async function (req, res, next) {
  try {
    // Retrieve the most recent version of the record corresponding to the specified APA's component UUID, and throw an error if there is no such record
    const component = await Components.retrieve({ componentUuid: req.params.uuid });

    if (!component) return res.status(404).send(`There is no assembled APA record with component UUID = ${req.params.uuid}`);

    // Retrieve the collated information about the APA - since this requires extracting specific field values from a number of DB records related to the APA ...
    // ... it is easier to collate this information through a single library function, rather than performing multiple library function calls from this route
    let collatedInfo = await Components_ExecSummary.collateInfo(req.params.uuid);

    // Render the interface page
    res.render('component_execSummary.pug', {
      component,
      collatedInfo,
    });
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// Create a new component
router.get('/component/:typeFormId/new', permissions.checkPermission('components:edit'), async function (req, res, next) {
  try {
    // Retrieve the component type form corresponding to the specified type form ID, and throw an error if there is no such type form
    const componentTypeForm = await Forms.retrieve('componentForms', req.params.typeFormId);

    if (!componentTypeForm) return res.status(404).send(`There is no component type form with form ID = ${req.params.typeFormId}`);

    // Generate a new full UUID and set the type form ID equal to the provided one
    const componentUuid = Components.newUuid().toString();
    const componentTypeFormId = req.params.typeFormId;

    // For component types that have the 'isBatch' property ...
    // ... not all of them do, since this property was added after some component type forms have already been created ...
    let subComponent_fullUuids = [];
    let subComponent_shortUuids = [];

    if (componentTypeForm.hasOwnProperty('isBatch')) {
      // ... and the value of the property is 'true' ( since the existence of the property is not a guarantee that it is 'true') ...
      if (componentTypeForm.isBatch) {
        // ... generate a large number of UUIDs for the batch sub-components, to be passed to the component editing page (where they will be added into the actual component data)
        // At this stage we don't know how many sub-components are required (since that information has not been entered into the type form yet), so prepare for any (reasonable!) number

        // The sub-component UUIDs must be generated here, and not within the component editing page itself, because that page operates at browser level ...
        // ... meaning that it does not have access to the server-side library that actually generates UUIDs
        for (let i = 0; i < 250; i++) {
          const fullUuid = Components.newUuid().toString();
          const shortUuid = ShortUUID().fromUUID(fullUuid);

          subComponent_fullUuids.push(fullUuid);
          subComponent_shortUuids.push(shortUuid);
        }
      }
    }

    // Get a list of the current component count per type across all existing component types
    const componentCounts_byType = await Components.counts_byType();

    // Set the workflow ID if one is provided
    let workflowId = '';

    if (req.query.workflowId) workflowId = req.query.workflowId;

    // Render the interface page
    res.render('component_edit.pug', {
      component: {
        componentUuid,
        componentTypeFormId,
      },
      componentTypeForm,
      subComponent_fullUuids,
      subComponent_shortUuids,
      componentCounts_byType,
      workflowId,
    });
  } catch (err) {
    logger.info(err);
    res.status(500).send(err.toString());
  }
});


/// Create a new component type
router.get('/componentTypes/:typeFormId/new', permissions.checkPermission('forms:edit'), async function (req, res) {
  try {
    // Check that the specified type form ID is not already being used - attempt to retrieve any and all existing type forms with this type form ID
    let typeForm = await Forms.retrieve('componentForms', req.params.typeFormId);

    // If there are no existing type forms, set up a new one using the specified type form ID and an initially empty form schema, and save it into the 'componentForms' collection
    // Use the form ID as the form name to start with - the user will have the option of changing the name later via the interface
    if (!typeForm) {
      typeForm = {
        formId: req.params.typeFormId,
        formName: req.params.typeFormId,
        schema: { components: [] },
      };

      Forms.save(typeForm, 'componentForms', req);
    }

    // Redirect the user to the interface page for editing an existing component type form
    res.redirect(302, `/componentTypes/${req.params.typeFormId}/edit`);
  } catch (err) {
    logger.info(err);
    res.status(500).send(err.toString());
  }
});


/// Edit an existing component type
router.get('/componentTypes/:typeFormId/edit', permissions.checkPermission('forms:edit'), async function (req, res) {
  try {
    // Render the interface page
    res.render('component_editTypeForm.pug', {
      collection: 'componentForms',
      formId: req.params.typeFormId,
    });
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// List all component types
router.get('/componentTypes/list', permissions.checkPermission('components:view'), async function (req, res, next) {
  try {
    // Retrieve a list of component counts per type across all existing component types
    const componentCounts_byType = await Components.counts_byType();

    // Render the interface page
    res.render('component_listTypes.pug', { componentCounts_byType });
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// List all components across all component types
router.get('/components/list', permissions.checkPermission('components:view'), async function (req, res, next) {
  try {
    // Retrieve records of all components across all component types
    // The first argument should be 'null' in order to match to any type form ID
    const components = await Components.list(null, { limit: 200 });

    // Retrieve a list of all component type forms that currently exist in the 'componentForms' collection
    const allComponentTypeForms = await Forms.list('componentForms');

    // Render the interface page
    res.render('component_list.pug', {
      components,
      singleType: false,
      title: 'All Created / Edited Components (All Types)',
      allComponentTypeForms,
      workflowComponent: false,
    });
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// List all components of a single component type
router.get('/components/:typeFormId/list', permissions.checkPermission('components:view'), async function (req, res, next) {
  try {
    // Retrieve records of all components with the specified component type
    // The first argument should be an object consisting of the match condition, i.e. the type form ID to match to
    const components = await Components.list({ formId: req.params.typeFormId }, { limit: 500 });

    // Retrieve the component type form corresponding to the specified type form ID
    const componentTypeForm = await Forms.retrieve('componentForms', req.params.typeFormId);

    // Retrieve a list of all component type forms that currently exist in the 'componentForms' collection
    const allComponentTypeForms = await Forms.list('componentForms');

    // Set a variable to indicate if the specified component type is one that is the subject of a workflow
    // First set up a list of component type form IDs for all components that are the subject of any workflow (there are only two workflow types, so we can do this explicitly)
    // Then check to see if the list of component type form IDs includes the type form ID of the component type being specified
    const list_workflowComponents = ['AssembledAPA', 'APAFrame', 'APAShipment'];
    const workflowComponent = list_workflowComponents.includes(req.params.typeFormId);

    // Render the interface page
    res.render('component_list.pug', {
      components,
      singleType: true,
      title: 'All Created / Edited Components (Single Type)',
      componentTypeForm,
      allComponentTypeForms,
      workflowComponent,
    });
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// View and print the QR codes of all components of the specified type and within the specified range of type record numbers (client-side interface)
router.get('/components/bulkQRCodes', async function (req, res, next) {
  // Render the interface page
  res.render('component_bulkQRCodeSelector.pug');
});


/// View and print the QR codes of all components of the specified type and within the specified range of type record numbers (query to server-side)
router.get('/components/bulkQRCodes/:typeFormId/:firstNumber/:lastNumber', permissions.checkPermission('components:view'), async function (req, res, next) {
  try {
    // Set up and populate a list of the components' shortened UUIDs (plus some useful information to display alongside the component QR codes)
    let shortUUIDs = [];

    // For each value of the type record number in the specified range (including both the first and last ones) ...
    // ... and each returned component with that type record number (since certain component types can have multiple components sharing the same type record number) ...
    // ... retrieve a reduced instance of the component record corresponding to the specified type form ID and type record number value, and add the information in the correct order to the  list
    for (let typeRecordNumber = parseInt(req.params.firstNumber, 10); typeRecordNumber <= parseInt(req.params.lastNumber, 10); typeRecordNumber++) {
      const componentsList = await Search_OtherComponents.componentsByTypeAndNumber(req.params.typeFormId, typeRecordNumber);

      for (const componentRecord of componentsList) { shortUUIDs.push([componentRecord.componentName, componentRecord.shortUuid]); }
    }

    // Render the interface page
    res.render('component_bulkQRCodeViewer.pug', { shortUUIDs });
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// Retrieve an existing component record via its UUID
router.get(['/json/component/:uuid', '/api/component/:uuid'], permissions.checkPermissionJson('components:view'), async function (req, res, next) {
  try {
    // Set up a query object consisting of the specified component UUID and a version number if one is provided (if not, the most recent version is assumed)
    let query = { componentUuid: req.params.uuid };

    if (req.query.version) query['validity.version'] = parseInt(req.query.version, 10);

    // Retrieve the specified version of the record
    // If there is no record corresponding to the UUID, or the version number is not valid, this returns 'null'
    const component = await Components.retrieve(query);

    // Return the record in JSON format
    return res.status(200).json(component);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Retrieve an existing component record via its type form ID and type record number
router.get(['/json/component/:typeFormId/:typeRecordNumber', '/api/component/:typeFormId/:typeRecordNumber'], permissions.checkPermissionJson('components:view'), async function (req, res, next) {
  try {
    // Retrieve a reduced instance of the component record corresponding to the specified type form ID and type record number
    const componentsList = await Search_OtherComponents.componentsByTypeAndNumber(req.params.typeFormId, req.params.typeRecordNumber);

    // If at least one record has been returned, return it in JSON format ... otherwise, return 'null' explicitly (also in JSON format)
    if (componentsList.length > 0) {
      return res.status(200).json(componentsList[0]);
    } else {
      return res.status(200).json(null);
    }

  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Create a new component or edit an existing component record
router.post(['/json/component', '/api/component'], permissions.checkPermissionJson('components:edit'), async function (req, res, next) {
  try {
    // Display a logger message indicating that a record is being saved via the '/component' route
    logger.info(req.body, 'Submission to /component');

    // Save the record ... if successful, this returns the component UUID
    const componentUuid = await Components.save(req.body, req);

    // Return the record's component UUID
    return res.status(201).json(componentUuid);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Save all individual sub-component records from a single batch
router.post(['/json/componentBatch', '/api/componentBatch'], permissions.checkPermissionJson('components:edit'), async function (req, res, next) {
  try {
    // The 'req.body' contains an array of the individual sub-component submission objects, so loop over these and save them one by one
    // Save each sub-component's returned component UUID into an array, and additionally display a logger message indicating that each record is being saved via the '/componentBatch' route
    let componentUuids = [];

    req.body.forEach(function (subComponent) {
      logger.info(subComponent, 'Submission to /componentBatch');

      const componentUuid = Components.save(subComponent, req);
      componentUuids.push(componentUuid);
    });

    // Return the array of sub-component component UUIDs
    return res.status(201).json(componentUuids);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Generate a new component UUID
router.get(['/json/newComponentUUID', '/api/newComponentUUID'], async function (req, res, next) {
  try {
    // Create a new full UUID
    const componentUuid = Components.newUuid().toString();

    // Return the newly generated UUID
    return res.status(201).json(componentUuid);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Confirm that a specified short UUID corresponds to the full UUID in an existing component record
router.get(['/json/confirmShortUUID/:shortuuid', '/api/confirmShortUUID/:shortuuid'], async function (req, res, next) {
  try {
    // A short UUID may be encoded in one of two formats: base 58 (the default encoding alphabet used by the 'short-uuid' library), or base 57

    // First, decode a full UUID from the specified short one using the base 58 alphabet, and attempt to find a corresponding component record
    let uuid = ShortUUID().toUUID(req.params.shortuuid);
    let component = await Components.retrieve(uuid);

    // If there is no component record found, do the same again but now using the base 57 alphabet to decode the full UUID
    if (!component) {
      uuid = ShortUUID('23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz').toUUID(req.params.shortuuid);
      component = await Components.retrieve(uuid);
    }

    // If there is still no record found, return an appropriate error message
    if (!component) return res.status(404).json({ error: `There is no component record with component UUID = ${uuid}` });

    // Otherwise, return the full UUID that corresponded to an existing component record
    return res.status(200).json(uuid);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Retrieve a list of all components of a single component type
router.get(['/json/components/:typeFormId/list', '/api/components/:typeFormId/list'], permissions.checkPermissionJson('components:view'), async function (req, res, next) {
  try {
    // Retrieve records of all components with the specified component type
    // The first argument should be an object consisting of the match condition, i.e. the type form ID to match to
    const components = await Components.list({ formId: req.params.typeFormId }, { limit: 500 });

    // Extract only the UUID field (in string format) from each component record, and save it into a list to be returned
    let componentUUIDs = [];

    for (const component of components) {
      componentUUIDs.push(MUUID.from(component.componentUuid).toString());
    }

    // Return the list of UUIDs
    return res.status(200).json(componentUUIDs);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// Retrieve a list of geometry board counts across all [board part number, board location] combinations
router.get(['/json/components/boardCounts_byPartNumberAndLocation', '/api/components/boardCounts_byPartNumberAndLocation'], permissions.checkPermissionJson('components:view'), async function (req, res, next) {
  try {
    // Retrieve a list of geometry board counts across all [board part number, board location] combinations
    const boardCounts_byPartNumberAndLocation = await Components.boardCounts_byPartNumberAndLocation();

    // Return the list of geometry board counts
    return res.status(200).json(boardCounts_byPartNumberAndLocation);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


module.exports = router;
