const deepmerge = require('deepmerge');
const { readFileSync } = require('fs');
const router = require('express').Router();
const shortuuid = require('short-uuid')();

const Actions = require('lib/Actions.js');
const Components = require('lib/Components.js');
const Forms = require('lib/Forms.js');
const logger = require('../lib/logger');
const permissions = require('lib/permissions.js');
const utils = require('lib/utils.js');

const default_form_schema = JSON.parse(readFileSync('./schemas/default_form_schema.json'));


/// View a single component record
router.get('/component/' + utils.uuid_regex, permissions.checkPermission('components:view'), async function (req, res, next) {
  try {
    // Set up a database query that includes the specified component UUID and a version number if also provided
    let query = { componentUuid: req.params.uuid };

    if (req.query.version) query['validity.version'] = parseInt(req.query.version, 10);

    // Retrieve the specified version of the record using the query
    // Simultaneously, retrieve ALL versions of the same record
    const [component, componentVersions] = await Promise.all([
      Components.retrieve(query),
      Components.versions(req.params.uuid),
    ]);

    // Throw an error if there is no record corresponding to the query
    if (!component) return res.status(404).send(`There is no component record with component UUID = ${req.params.uuid}`);

    // Get other information relating to this component:
    //  - the component type form, using its type form ID (which is specified in the record)
    //  - records of all actions that have already been performed on this component
    //  - all currently available action type forms
    const [componentTypeForm, actions, actionTypeForms] = await Promise.all([
      Forms.retrieve('componentForms', component.formId),
      Actions.list({ componentUuid: req.params.uuid }),
      Forms.list('actionForms'),
    ]);

    // Throw an error if there is no type form corresponding to the type form ID
    if (!componentTypeForm) return res.status(404).send(`There is no component type form with form ID = ${component.formId}`);

    // Render the interface page for viewing a component record
    res.render('component.pug', {
      component,
      componentVersions,
      componentTypeForm,
      actions,
      actionTypeForms,
    });
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// Redirect a shortened record page URL (used by a component's QR code) to the full record page URL
router.get('/c/' + utils.short_uuid_regex, async function (req, res, next) {
  try {
    // Reconstruct the full UUID from the shortened UUID
    const componentUuid = shortuuid.toUUID(req.params.shortuuid);

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
    // Retrieve the most recent version of the record corresponding to the specified component UUID
    const component = await Components.retrieve(req.params.uuid);

    // Throw an error if there is no record corresponding to the component UUID
    if (!component) return res.status(404).send(`There is no component record with component UUID = ${req.params.uuid}`);

    // Render the interface page for viewing and printing a component's QR codes
    res.render('component_qrCodes.pug', { component });
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// View and print a single component's summary
router.get('/component/' + utils.uuid_regex + '/summary', permissions.checkPermission('components:view'), async function (req, res, next) {
  try {
    // Retrieve the most recent version of the component record
    const component = await Components.retrieve({ componentUuid: req.params.uuid });

    // Get other information relating to this component:
    //  - the component type form, using its type form ID (which is specified in the record)
    //  - records of all actions that have already been performed on this component
    const [componentTypeForm, actions] = await Promise.all([
      Forms.retrieve('componentForms', component.formId),
      Actions.list({ componentUuid: req.params.uuid }),
    ]);

    // Each record returned by the 'Actions.list' function contains only the bare minimum of information about that action
    // However, we want more than this for the component summary, so for each returned action, retrieve and store the full record
    let fullActions = [];

    for (let i = 0; i < actions.length; i++) {
      fullActions.push(await Actions.retrieve({ actionId: actions[i].actionId }));
    }

    // Render the interface page for viewing and printing a component's summary
    res.render('component_summary.pug', {
      component,
      componentTypeForm,
      actions: fullActions,
    });
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// Create a new component of a given type
router.get('/component/:typeFormId', permissions.checkPermission('components:edit'), async function (req, res, next) {
  try {
    // Retrieve the component type form corresponding to the specified type form ID
    const componentTypeForm = await Forms.retrieve('componentForms', req.params.typeFormId);

    // Throw an error if there is no type form corresponding to the type form ID
    if (!componentTypeForm) return res.status(404).send(`There is no component type form with form ID = ${req.params.typeFormId}`);

    // Generate a new full UUID
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
          const shortUuid = shortuuid.fromUUID(fullUuid);

          subComponent_fullUuids.push(fullUuid);
          subComponent_shortUuids.push(shortUuid);
        }
      }
    }

    // Simultaneously retrieve the following information about the component types:
    //  - a list of all component type forms that currently exist in the 'componentForms' collection
    //  - a list of component counts by type, for all type forms that already have at least 1 recorded component
    const [componentTypeForms, componentCountsByType] = await Promise.all([
      Forms.list('componentForms'),
      Components.componentCountsByTypes(),
    ]);

    // Merge the lists above, to create a single list of component counts by type that also includes types that do not have recorded components
    const componentTypesAndCounts = deepmerge(componentCountsByType, componentTypeForms);

    // Pass any provided workflow ID
    let workflowId = '';

    if (req.query.workflowId) workflowId = req.query.workflowId;

    // Render the interface page for editing an existing component
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
    // Retrieve the most recent version of the record corresponding to the specified component UUID
    const component = await Components.retrieve(req.params.uuid);

    // Throw an error if there is no record corresponding to the component UUID
    if (!component) return res.status(404).send(`There is no component record with component UUID = ${req.params.uuid}`);

    // Retrieve the component type form, using its type form ID (which is specified in the record)
    const componentTypeForm = await Forms.retrieve('componentForms', component.formId);

    // Throw an error if there is no type form corresponding to the type form ID
    if (!componentTypeForm) return res.status(404).send(`There is no component type form with form ID = ${component.formId}`);

    // Render the interface page for editing an existing component
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


/// Update the most recently logged reception locations and dates of all geometry boards in a board shipment
/// This is a highly specialised route, to be used ONLY for geometry boards and via a 'Board Reception' type action submission
/// If other component locations are required to be updated, this can be added to the code in the future
router.get('/component/' + utils.uuid_regex + '/updateBoardLocations/:location/:date', permissions.checkPermission('components:edit'), async function (req, res, next) {
  try {
    // Retrieve the most recent version of the board shipment record corresponding to the specified component UUID
    const shipment = await Components.retrieve(req.params.uuid);

    // Throw an error if there is no record corresponding to the component UUID
    if (!shipment) return res.status(404).send(`There is no component record with component UUID = ${req.params.uuid}`);

    // Isolate the part of the record that holds the individual board UUIDs
    const boardData = shipment.data.boardUuiDs;

    // For each individual board, extract the board UUID and update the reception location and date to those passed from the 'Board Reception' action
    // The updating function returns the updated board component record, but we don't actually need to use it
    for (const board of boardData) {
      const updatedBoard = await Components.updateLocation(board.component_uuid, req.params.location, req.params.date);
    }

    // Depending on if the originating 'Board Reception' action was part of a workflow or not, redirect to an appropriate location
    // If the action originated from a workflow (i.e. a workflow ID has been provided), go to the page for updating the workflow path step results
    // On the other hand, if it was a standalone action, go to the page for viewing an action record
    // Note that these redirections are identical to those performed after submitting ANY action (see 'static/pages/action_specComponent.js')
    if (req.query.workflowId) {
      res.redirect(`/workflow/${req.query.workflowId}/action/${req.query.actionId}`);
    } else {
      res.redirect(`/action/${req.query.actionId}`);
    }
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// Create a new component type form
router.get('/componentTypes/:typeFormId/new', permissions.checkPermission('forms:edit'), async function (req, res) {
  try {
    // Check that the specified type form ID is not already being used
    // Attempt to retrieve any and all existing type forms with this type form ID
    let typeForm = await Forms.retrieve('componentForms', req.params.typeFormId);

    // If there are no existing type forms, set up a new one using the specified type form ID and the default form schema
    // Then save the new type form into the 'componentForms' collection of records
    // Initially, use the form ID as the form name as well - the user will have the option of changing the name later
    if (!typeForm) {
      typeForm = {
        formId: req.params.typeFormId,
        formName: req.params.typeFormId,
        schema: default_form_schema,
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
    // Render the interface page for editing an existing component type form
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
    // Simultaneously retrieve the following information about the component types:
    //  - a list of component counts by type, for all type forms
    //  - a list of maximum component 'typeRecordNumber' by type, for all type forms
    const [componentCountsByType, maxComponentTRNByType] = await Promise.all([
      Components.componentCountsByTypes(),
      Components.maxComponentTRNByTypes(),
    ]);

    // Render the interface page for listing all component types
    res.render('component_listTypes.pug', { componentCountsByType, maxComponentTRNByType });
  } catch (err) {
    logger.error(err);
    res.status(500).send(err.toString());
  }
});


/// List all components across all component types
router.get('/components/list', permissions.checkPermission('components:view'), async function (req, res, next) {
  try {
    // Retrieve records of all components across all component types
    // The first argument ('match_condition') should be 'null' in roder to match to any record
    const components = await Components.list(null, { limit: 100 });

    // Retrieve a list of all component type forms that currently exist in the 'componentForms' collection
    const allComponentTypeForms = await Forms.list('componentForms');

    // Render the interface page for showing a generic list of components
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
    // Construct the 'match_condition' to be used for querying the database
    // For this route, it is that a record's component type form ID must match the specified one
    const match_condition = { formId: req.params.typeFormId };

    // Retrieve a list of records that match the specified condition
    const components = await Components.list(match_condition, { limit: 100 });

    // Retrieve the component type form corresponding to the specified type form ID
    const componentTypeForm = await Forms.retrieve('componentForms', req.params.typeFormId);

    // Retrieve a list of all component type forms that currently exist in the 'componentForms' collection
    const allComponentTypeForms = await Forms.list('componentForms');

    // Render the interface page for showing a generic list of components
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
