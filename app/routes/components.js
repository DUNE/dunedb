const router = require('express').Router();
const ShortUUID = require('short-uuid');

const Actions = require('../lib/Actions');
const Components = require('../lib/Components');
const Forms = require('../lib/Forms');
const logger = require('../lib/logger');
const permissions = require('../lib/permissions');
const utils = require('../lib/utils');


/// View a single component record
router.get('/component/' + utils.uuid_regex, permissions.checkPermission('components:view'), async function (req, res, next) {
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
    const [componentTypeForm, actions, actionTypeForms] = await Promise.all([
      Forms.retrieve('componentForms', component.formId),
      Actions.list({ componentUuid: req.params.uuid }),
      Forms.list('actionForms'),
    ]);

    if (!componentTypeForm) return res.status(404).send(`There is no component type form with form ID = ${component.formId}`);

    // For 'Geometry Board Shipment' type components, set up an array containing more detailed information about each board in the shipment
    // This is required for this particular type of component, because by itself it only contains the UUIDs of the related boards
    // (Contrast with 'Geometry Board Batch' type components, which natively contain both the UUIDs and UKIDs of the related boards)
    let shipmentDetails = [];

    if (component.formId === 'BoardShipment') {
      for (const info of component.data.boardUuiDs) {
        let uuid = info.component_uuid;
        let ukid = 'none';

        if (uuid === '') uuid = 'none';
        else {
          const boardRecord = await Components.retrieve(uuid);

          if (boardRecord) ukid = boardRecord.data.typeRecordNumber;
        }

        shipmentDetails.push([uuid, ukid]);
      }
    }

    // Render the interface page
    res.render('component.pug', {
      component,
      componentVersions,
      componentTypeForm,
      shipmentDetails,
      actions,
      actionTypeForms,
    });
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// Redirect a shortened component record page URL (used by a component's QR code) to the full URL
router.get('/c/' + utils.short_uuid_regex, async function (req, res, next) {
  try {
    // Reconstruct the full UUID from the shortened UUID
    const componentUuid = ShortUUID().toUUID(req.params.shortuuid);

    // Redirect the user to the interface page for viewing a component record
    res.redirect(`/component/${componentUuid}`);
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// View and print a single component's QR codes
router.get('/component/' + utils.uuid_regex + '/qrCodes', permissions.checkPermission('components:view'), async function (req, res, next) {
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


/// View and print a single component's summary
router.get('/component/' + utils.uuid_regex + '/summary', permissions.checkPermission('components:view'), async function (req, res, next) {
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

    // Each action record contains only the bare minimum of information about that action, so for each one, retrieve and store the full record
    let fullActions = [];

    for (let i = 0; i < actions.length; i++) {
      fullActions.push(await Actions.retrieve({ actionId: actions[i].actionId }));
    }

    // We would like the actions to be ordered in a specific way in the summary document, to make it easier to find any given action (particularly when there are a lot of actions):
    //   - first, all non-conformance actions
    //   - then, all other workflow-originating actions
    //   - and finally, any other remaining actions
    // with the actions in each section ordered chronologically, i.e. earliest first
    let nonConformActions = [];
    let workflowActions = [];
    let otherActions = [];

    // Loop through the action records, and save them into separate arrays based on the action type form and whether or not the record has a 'workflowId' field or not
    // Note that because the retrieved actions are natively in reverse chronological order (i.e. most recent first), this will be the ordering in the separated arrays as well
    for (let i = 0; i < fullActions.length; i++) {
      if (fullActions[i].typeFormId === 'APANonConformance') {
        nonConformActions.push(fullActions[i]);
      } else {
        if (fullActions[i].hasOwnProperty('workflowId')) {
          workflowActions.push(fullActions[i])
        } else {
          otherActions.push(fullActions[i]);
        }
      }
    }

    // Reverse the separated arrays to get the actions in chronological order
    const chrono_nonConformActions = nonConformActions.reverse();
    const chrono_workflowActions = workflowActions.reverse();
    const chrono_otherActions = otherActions.reverse();

    // For 'Geometry Board Shipment' type components, set up an array containing more detailed information about each board in the shipment
    // This is required for this particular type of component, because by itself it only contains the UUIDs of the related boards
    // (Contrast with 'Geometry Board Batch' type components, which natively contain both the UUIDs and UKIDs of the related boards)
    let shipmentDetails = [];

    if (component.formId === 'BoardShipment') {
      for (const info of component.data.boardUuiDs) {
        let uuid = info.component_uuid;
        let ukid = 'none';

        if (uuid === '') uuid = 'none';
        else {
          const boardRecord = await Components.retrieve(uuid);
          ukid = boardRecord.data.typeRecordNumber;
        }

        shipmentDetails.push([uuid, ukid]);
      }
    }

    // Render the interface page
    res.render('component_summary.pug', {
      component,
      componentTypeForm,
      shipmentDetails,
      nonConformActions: chrono_nonConformActions,
      workflowActions: chrono_workflowActions,
      otherActions: chrono_otherActions,
    });
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// View and print an assembled APA's executive summary
/// Note that this is different from an assembled APA's more general component summary, and executive summaries are only generated for assembled APAs 
router.get('/component/' + utils.uuid_regex + '/execSummary', permissions.checkPermission('components:view'), async function (req, res, next) {
  try {
    // Retrieve the most recent version of the record corresponding to the specified APA's component UUID, and throw an error if there is no such record
    const component = await Components.retrieve({ componentUuid: req.params.uuid });

    if (!component) return res.status(404).send(`There is no assembled APA record with component UUID = ${req.params.uuid}`);

    // Retrieve the collated information about the APA - since this requires extracting specific field values from a number of DB records related to the APA ...
    // ... it is easier to collate this information through a single library function, rather than performing multiple library function calls from this route
    let collatedInformation = await Components.collateExecSummaryInfo(req.params.uuid);

    // Add relevant information from the APA's component record to the collated information
    const dictionary_productionSites = {
      chicago: 'Chicago',
      daresbury: 'Daresbury',
      wisconsin: 'Wisconsin',
    };

    const dictionary_topOrBottom = {
      top: 'Top',
      bottom: 'Bottom',
    };

    collatedInformation.dunePID = component.data.name;
    collatedInformation.productionSite = dictionary_productionSites[component.data.apaAssemblyLocation];
    collatedInformation.topOrBottom = dictionary_topOrBottom[component.data.apaConfiguration];

    // Render the interface page
    res.render('component_execSummary.pug', {
      component,
      collatedInformation,
    });
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// Create a new component of a given type
router.get('/component/:typeFormId', permissions.checkPermission('components:edit'), async function (req, res, next) {
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
    const componentTypesAndCounts = await Components.componentCountsByTypes();

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
      componentTypesAndCounts,
      workflowId,
    });
  } catch (err) {
    logger.info(err);
    res.status(500).send(err.toString());
  }
});


/// Edit an existing component
router.get('/component/' + utils.uuid_regex + '/edit', permissions.checkPermission('components:edit'), async function (req, res, next) {
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
      componentTypesAndCounts: [],
      workflowId: '',
    });
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// Update the most recently recorded reception location and date of all geometry boards in a shipment of new geometry boards or batch of returned geometry boards
/// This is an internal route - it should not be accessed directly by a user through their browser ...
/// ... instead, it is automatically called during submission of a 'Board Reception' action or 'Returned Geometry Board Batch' component 
router.get('/component/' + utils.uuid_regex + '/updateBoardLocations/:location/:date', permissions.checkPermission('components:edit'), async function (req, res, next) {
  try {
    // Retrieve the most recent version of the board shipment or batch record corresponding to the specified component UUID
    const boardCollection = await Components.retrieve(req.params.uuid);

    // Because the board UUIDs are stored differently in 'Board Shipment' and 'Returned Geometry Board Batch' type components, set up separate (but annoyingly similar!) scenarios for each one
    if (boardCollection.formId === 'BoardShipment') {
      // Throw an error if there is no record corresponding to the specified UUID
      if (!boardCollection) return res.status(404).send(`There is no geometry board shipment with component UUID = ${req.params.uuid}`);

      // For each board in the shipment, extract the board UUID and update the reception location and date to those inherited from the 'Board Reception' action
      // If successful, the updating function returns 'result = 1', but we don't actually need this value for anything
      for (const board of boardCollection.data.boardUuiDs) {
        const result = await Components.updateLocation(board.component_uuid, req.params.location, req.params.date);
      }

      // Depending on if the originating 'Board Reception' action was part of a workflow or not, redirect to an appropriate page
      // If the action originated from a workflow (and therefore a workflow ID has been provided), go to the page for updating the workflow path step results
      // On the other hand, if it was a standalone action, go to the page for viewing the action record
      // Note that these redirections are identical to those performed after submitting ANY action (see '/app/static/pages/action_specComponent.js')
      if (req.query.workflowId) {
        res.redirect(`/workflow/${req.query.workflowId}/action/${req.query.actionId}`);
      } else {
        res.redirect(`/action/${req.query.actionId}`);
      }
    } else if (boardCollection.formId === 'ReturnedGeometryBoardBatch') {
      // Throw an error if there is no record corresponding to the specified UUID
      if (!boardCollection) return res.status(404).send(`There is no returned geometry board batch with component UUID = ${req.params.uuid}`);

      // For each board in the batch, extract the board UUID and update the reception location and date to those passed from the batch's submission
      // If successful, the updating function returns 'result = 1', but we don't actually need this value for anything
      for (const board of boardCollection.data.boardUuids) {
        const result = await Components.updateLocation(board.component_uuid, req.params.location, req.params.date);
      }

      // Once all boards have been updated, redirect to the page for viewing the component record
      res.redirect(`/component/${req.params.uuid}`);
    }
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// Create a new component type form
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
    res.redirect(`/componentTypes/${req.params.typeFormId}/edit`);
  } catch (err) {
    logger.info(err);
    res.status(500).send(err.toString());
  }
});


/// Edit an existing component type form
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
    // Retrieve a list of component counts by type across all type forms
    const componentCountsByType = await Components.componentCountsByTypes();

    // Render the interface page
    res.render('component_listTypes.pug', { componentCountsByType });
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
    const components = await Components.list({ formId: req.params.typeFormId }, { limit: 200 });

    // Retrieve the component type form corresponding to the specified type form ID
    const componentTypeForm = await Forms.retrieve('componentForms', req.params.typeFormId);

    // Retrieve a list of all component type forms that currently exist in the 'componentForms' collection
    const allComponentTypeForms = await Forms.list('componentForms');

    // Render the interface page
    res.render('component_list.pug', {
      components,
      singleType: true,
      title: 'All Created / Edited Components (Single Type)',
      componentTypeForm,
      allComponentTypeForms,
    });
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


module.exports = router;
