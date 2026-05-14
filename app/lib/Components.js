const Binary = require('mongodb').Binary;
const MUUID = require('uuid-mongodb');
const ShortUUID = require('short-uuid');

const commonSchema = require('./commonSchema');
const { db } = require('./db');
const dbLock = require('./dbLock');
const Forms = require('./Forms');
const permissions = require('./permissions');
const utils = require('./utils');


/// Generate a new component UUID
function newUuid() {
  // Ideally, we want to satisfy as many of the following criteria as possible in a good UUID:
  //  - a) zero collision chance
  //  - b) include some timestamp or other metadata
  //  - c) first characters to be unique as possible, so that auto-complete works well
  //
  // This is a conundrum ... UUID.v1() is in principle entirely based on generation time and MAC address, so it does a) and b), but not c)
  // On the other hand, UUID.v4 satisifies c) but not a) or b)
  // ObjectId is close - it uses high bits for time, medium bits are random, and low bits are sequential-ordering to prevent conflict
  // But the plot thickens - the UUID.v1() generation code cheats ns and MAC code, and also actually puts the medium time in the high bits, meaning they are in fact semi-random when not generated simultaneously!

  return MUUID.v1();
}


/// Save a new or edited component record
async function save(input, req) {
  // Check that the user has permission to create and edit components
  if (!permissions.hasPermission(req, 'components:edit')) throw new Error(`Components::save() - you do not have permission [components:edit] to create and/or edit components!`);

  // Check that the minimum required component information has been provided
  //   - the component UUID
  //   - the component type form ID
  //   - user-provided data (this may be an empty object, but must still exist)
  if (!(input instanceof Object)) throw new Error(`Components::save() - the 'input' object has not been specified!`);
  if (!input.hasOwnProperty('componentUuid')) throw new Error(`Components::save() - the 'input.componentUuid' has not been specified!`);
  if (!input.hasOwnProperty('formId')) throw new Error(`Components::save() - the 'input.formId' has not been specified!`);
  if (!input.hasOwnProperty('data')) throw new Error(`Components::save() - the 'input.data' has not been specified!`);

  // Check that there is an existing type form corresponding to the the provided type form ID, and that the type form is not currently 'trashed'
  const typeFormsList = await Forms.list('componentForms');
  const typeForm = typeFormsList[input.formId];

  if (!typeForm) throw new Error(`Components:save() - the specified 'input.formId' (${input.formId}) does not match a known component type form!`);
  if (typeForm.tags.includes('Trash')) throw new Error(`Components:save() - the specified component type form (${input.formId}) is currently trashed, and cannot be used!`);

  // Set up a new record object, and immediately add some information, either directly or inherited from the 'input' object
  let newRecord = {};

  newRecord.recordType = 'component';
  newRecord.componentUuid = MUUID.from(input.componentUuid);
  newRecord.shortUuid = ShortUUID().fromUUID(input.componentUuid);
  newRecord.formId = input.formId;
  newRecord.formName = typeForm.formName;
  newRecord.data = input.data;

  if (input.workflowId) newRecord.workflowId = input.workflowId;

  // Generate and add an 'insertion' field to the new record
  newRecord.insertion = commonSchema.insertion(req);

  // Check if a record with the same component UUID as the specified one already exists
  // If so (i.e. the returned object is not 'null'), this indicates that we are editing an existing component, and if not (the returned object is 'null'), this is a new component
  let oldRecord = await retrieve(input.componentUuid);

  // Generate and add a 'validity' field to the new record, either from scratch for a new component, or via incrementing that from the existing component's record
  newRecord.validity = commonSchema.validity(oldRecord);
  newRecord.validity.ancestor_id = input._id;

  // If saving a new component record, certain objects and fields need to be set up and populated
  // If editing an existing component record, this same information will either already exist (from being included when the 'input.data' object was copied over above) or can be directly copied
  if (oldRecord === null) {
    // Get a list of the current component count per type across all existing component types, and then get the count of existing components of the same type as this one
    // If the component is a 'Geometry Board' type, offset the count, to account for an unknown number of boards that might have been manufactured before the database was up and running
    const componentCounts_byType = await counts_byType();
    let numberOfExistingComponents = 0;

    if (componentCounts_byType[input.formId].count) numberOfExistingComponents = componentCounts_byType[input.formId].count;
    if (input.formId === 'GeometryBoard') numberOfExistingComponents += 5000;

    // If the 'input.data' object does NOT contain a 'Type Record Number' field, add the component count to the new record's 'data' object under a new field
    // The field will exist only when creating new records for individual sub-components in a batch, since in this situation the sub-component type record numbers are determined on the client side
    if (!input.data.typeRecordNumber) newRecord.data.typeRecordNumber = numberOfExistingComponents + 1;

    // Every component should have a name and DUNE PID assigned to it ... if the name is based on unchangable or rarely changed fields in the record, it can be assigned here during creation
    // ... on the other hand, if the name is based on fields that are more likely to be changed by the user, it should be assigned and re-assigned any time the record is edited (see below)
    // The format of the name is dependent on the component type ... some are simply a combination of the type form name and type record number, whereas others have more information included
    const typeRecordNumber = String(newRecord.data.typeRecordNumber).padStart(5, '0');

    if (newRecord.formId === 'APAFrame') {
      let pidSuffix = '';

      if (newRecord.data.frameProductionLocation === 'dsm') {
        newRecord.data.componentName = `APA Frame ${typeRecordNumber}-UK`;
        pidSuffix = 'UK106-010000';
      } else if (newRecord.data.frameProductionLocation === 'wisconsin') {
        newRecord.data.componentName = `APA Frame ${typeRecordNumber}-US`;
        pidSuffix = 'US200-010000';
      }

      newRecord.data.dunePid = `D00300200001-${typeRecordNumber}-${pidSuffix}`;
    } else if (newRecord.formId === 'APAShippingFrame') {
      let pidSuffix = '';

      if (newRecord.data.asfLocation === 'chicago') {
        newRecord.data.componentName = `ASF ${typeRecordNumber}-US`;
        pidSuffix = 'US175-010000';
      } else if (newRecord.data.asfLocation === 'daresbury') {
        newRecord.data.componentName = `ASF ${typeRecordNumber}-UK`;
        pidSuffix = 'UK106-010000';
      } else if (newRecord.data.asfLocation === 'wisconsin') {
        newRecord.data.componentName = `ASF ${typeRecordNumber}-US`;
        pidSuffix = 'US200-010000';
      }

      newRecord.data.dunePid = `D003MMMNNNNN-${typeRecordNumber}-${pidSuffix}`;
    } else if (newRecord.formId === 'AssembledAPA') {
      let pidPrefix = '';
      let pidSuffix = '';

      if (newRecord.data.apaConfiguration === 'top') {
        pidPrefix = 'D00300100001';
      } else {
        pidPrefix = 'D00300100002';
      }

      if (newRecord.data.apaAssemblyLocation === 'chicago') {
        newRecord.data.componentName = `APA ${typeRecordNumber}-US`;
        pidSuffix = 'US175-010000';
      } else if (newRecord.data.apaAssemblyLocation === 'daresbury') {
        newRecord.data.componentName = `APA ${typeRecordNumber}-UK`;
        pidSuffix = 'UK106-010000';
      } else if (newRecord.data.apaAssemblyLocation === 'wisconsin') {
        newRecord.data.componentName = `APA ${typeRecordNumber}-US`;
        pidSuffix = 'US200-010000';
      }

      newRecord.data.dunePid = `${pidPrefix}-${typeRecordNumber}-${pidSuffix}`;
    } else if (newRecord.formId === 'CEAdapterBoard') {
      newRecord.data.componentName = `${newRecord.formName} ${typeRecordNumber}`;
      newRecord.data.dunePid = `D00300400003-${typeRecordNumber}-US200-010000`;
    } else if (newRecord.formId === 'CEAdapterBoardBatch') {
      newRecord.data.componentName = `${newRecord.formName} (${newRecord.data.subComponent_count}.${newRecord.validity.startDate.toISOString().substring(0, 10)})`;
      newRecord.data.dunePid = `D003MMMNNNNN-${typeRecordNumber}-COIII-010000`;
    } else if (newRecord.formId === 'CRBoard') {
      newRecord.data.componentName = `${newRecord.formName} ${typeRecordNumber}`;
      newRecord.data.dunePid = `D00300400001-${typeRecordNumber}-US200-010000`;
    } else if (newRecord.formId === 'CRBoardBatch') {
      newRecord.data.componentName = `${newRecord.formName} (${newRecord.data.subComponent_count}.${newRecord.validity.startDate.toISOString().substring(0, 10)})`;
      newRecord.data.dunePid = `D003MMMNNNNN-${typeRecordNumber}-COIII-010000`;
    } else if (newRecord.formId === 'CableHarness') {
      if (newRecord.data.cableHarnessSide === 'a') {
        newRecord.data.componentName = `${newRecord.formName} ${typeRecordNumber} (Side A)`;
        newRecord.data.dunePid = `D00300500002-${typeRecordNumber}-US200-010000`;
      } else if (newRecord.data.cableHarnessSide === 'b') {
        newRecord.data.componentName = `${newRecord.formName} ${typeRecordNumber} (Side B)`;
        newRecord.data.dunePid = `D00300500003-${typeRecordNumber}-US200-010000`;
      }
    } else if (newRecord.formId === 'DWA') {
      newRecord.data.componentName = `${newRecord.formName} ${typeRecordNumber}`;
      newRecord.data.dunePid = `D00300800001-${typeRecordNumber}-US136-010000`;
    } else if (newRecord.formId === 'DWAPDB') {
      newRecord.data.componentName = `DWA PDB ${typeRecordNumber}`;
      newRecord.data.dunePid = `D00300800002-${typeRecordNumber}-US136-010000`;
    } else if (newRecord.formId === 'GBiasBoard') {
      newRecord.data.componentName = `${newRecord.formName} ${typeRecordNumber}`;
      newRecord.data.dunePid = `D00300400002-${typeRecordNumber}-US200-010000`;
    } else if (newRecord.formId === 'GBiasBoardBatch') {
      newRecord.data.componentName = `${newRecord.formName} (${newRecord.data.subComponent_count}.${newRecord.validity.startDate.toISOString().substring(0, 10)})`;
      newRecord.data.dunePid = `D003MMMNNNNN-${typeRecordNumber}-COIII-010000`;
    } else if (newRecord.formId === 'GeometryBoard') {
      newRecord.data.componentName = `${newRecord.formName} ${typeRecordNumber} (${newRecord.data.partString})`;
      newRecord.data.dunePid = `D003003${utils.dictionary_geometryBoardPIDs[newRecord.data.partNumber]}-${typeRecordNumber}-UK109-010000`;
    } else if (newRecord.formId === 'GeometryBoardBatch') {
      newRecord.data.componentName = `${newRecord.formName} (${newRecord.data.subComponent_count}.PN${newRecord.data.subComponent_partNumber}.ON${newRecord.data.orderNumber})`;
      newRecord.data.dunePid = `D003MMMNNNNN-${typeRecordNumber}-COIII-010000`;
    } else if (newRecord.formId === 'GroundingMeshPanel') {
      newRecord.data.componentName = `${newRecord.formName} ${typeRecordNumber}`;
      newRecord.data.dunePid = `D00300200004-${typeRecordNumber}-UK106-010000`;
    } else if (newRecord.formId === 'ReturnedGeometryBoardBatch') {
      newRecord.data.componentName = `${newRecord.formName} (${newRecord.data.subComponent_count}.PN${newRecord.data.subComponent_partNumber}.ON${newRecord.data.orderNumber})`;
      newRecord.data.dunePid = `D003MMMNNNNN-${typeRecordNumber}-COIII-010000`;
    } else if (newRecord.formId === 'SHVBoard') {
      newRecord.data.componentName = `${newRecord.formName} ${typeRecordNumber}`;
      newRecord.data.dunePid = `D00300500001-${typeRecordNumber}-US200-010000`;
    } else if (newRecord.formId === 'WireBobbin') {
      newRecord.data.componentName = `${newRecord.formName} ${newRecord.data.bobbinId} (Lot ${newRecord.data.wireLot})`;
      newRecord.data.dunePid = `D003MMMNNNNN-${typeRecordNumber}-COIII-010000`;
    } else if (newRecord.formId === 'Yoke') {
      newRecord.data.componentName = `${newRecord.formName} ${typeRecordNumber}`;
      newRecord.data.dunePid = `D00301000001-${typeRecordNumber}-US200-010000`;
    }

    // Set up a new 'Reception' object to hold the component's current location and the date at which it was received at this location ... and we can immediately set the date to be the current one
    // This location information will eventually be changed later for certain component types, but it must exist first in order to do that
    // The 'detail' field can be used to store a string that might contain other addtional information about the component's location
    newRecord.reception = {};
    newRecord.reception.date = (new Date()).toISOString().slice(0, 10);
    newRecord.reception.detail = '';

    // Almost all component types will always start at specific fixed locations ...
    // ... the only exceptions are the 'batch' types (these still need the location field to exist, but it can be left as an empty string)
    if ((newRecord.formId === 'APAFrame') || (newRecord.formId === 'WireBobbin')) {
      newRecord.reception.location = 'daresbury';
    } else if (newRecord.formId === 'APAShippingFrame') {
      newRecord.reception.location = newRecord.data.asfLocation;
    } else if ((newRecord.formId === 'APAFrameShipment') || (newRecord.formId === 'DWAComponentShipment') || (newRecord.formId === 'GeometryBoardShipment') || (newRecord.formId === 'GroundingMeshPanelShipment') || (newRecord.formId === 'PopulatedBoardShipment') || (newRecord.formId === 'YokeShipment')) {
      newRecord.reception.location = 'in_transit';
    } else if (newRecord.formId === 'AssembledAPA') {
      newRecord.reception.location = newRecord.data.apaAssemblyLocation;
    } else if (newRecord.formId === 'AssembledAPAShipment') {
      newRecord.reception.location = newRecord.data.originOfShipment;
    } else if ((newRecord.formId === 'CEAdapterBoard') || (newRecord.formId === 'CEAdapterBoardShipment') || (newRecord.formId === 'CRBoard') || (newRecord.formId === 'CRBoardShipment') || (newRecord.formId === 'CableHarness') || (newRecord.formId === 'CableHarnessShipment') || (newRecord.formId === 'GBiasBoard') || (newRecord.formId === 'GBiasBoardShipment') || (newRecord.formId === 'SHVBoard') || (newRecord.formId === 'SHVBoardShipment') || (newRecord.formId === 'Yoke')) {
      newRecord.reception.location = 'wisconsin';
    } else if ((newRecord.formId === 'DWA') || (newRecord.formId === 'DWAPDB')) {
      newRecord.reception.location = newRecord.data.productionLocation;
    } else if (newRecord.formId === 'GeometryBoard') {
      newRecord.reception.location = 'lancaster';
    } else if (newRecord.formId === 'GroundingMeshPanel') {
      newRecord.reception.location = 'ukWarehouse';
    } else {
      newRecord.reception.location = '';
    }
  } else {
    newRecord.reception = input.reception;
  }

  // If the component name is based on fields that are more likely to be changed by the user, it should be assigned and re-assigned any time the record is edited
  // The DUNE PID of such components should technically be fixed at creation, but it is simpler code-wise to assign and re-assign that here as well
  const typeRecordNumber = String(newRecord.data.typeRecordNumber).padStart(5, '0');

  if (newRecord.formId === 'APAFrameShipment') {
    newRecord.data.componentName = `${newRecord.formName} (${newRecord.data.frameUuiDs.length}.${utils.dictionary_locations[newRecord.data.originOfShipment]}.${utils.dictionary_locations[newRecord.data.destinationOfShipment]})`;
    newRecord.data.dunePid = `D003MMMNNNNN-${typeRecordNumber}-COIII-010000`;
  } else if (newRecord.formId === 'AssembledAPAShipment') {
    let name_apa1 = '[not set]';
    let name_apa2 = '[not set]';

    if (newRecord.data.apaUuiDs[0].component_uuid !== '') {
      const apa = await retrieve(newRecord.data.apaUuiDs[0].component_uuid);
      name_apa1 = apa.data.componentName.substring(4);
    }

    if (newRecord.data.apaUuiDs[1].component_uuid !== '') {
      const apa = await retrieve(newRecord.data.apaUuiDs[1].component_uuid);
      name_apa2 = apa.data.componentName.substring(4);
    }

    newRecord.data.componentName = `${newRecord.formName} (${name_apa1} + ${name_apa2})`;
    newRecord.data.dunePid = `D003MMMNNNNN-${typeRecordNumber}-COIII-010000`;
  } else if (newRecord.formId === 'CEAdapterBoardShipment') {
    newRecord.data.componentName = `${newRecord.formName} ${typeRecordNumber} (${newRecord.data.boardUuiDs.length}.${newRecord.validity.startDate.toISOString().substring(0, 10)})`;
    newRecord.data.dunePid = `D003MMMNNNNN-${typeRecordNumber}-COIII-010000`;
  } else if (newRecord.formId === 'CRBoardShipment') {
    newRecord.data.componentName = `${newRecord.formName} ${typeRecordNumber} (${newRecord.data.boardUuiDs.length}.${newRecord.validity.startDate.toISOString().substring(0, 10)})`;
    newRecord.data.dunePid = `D003MMMNNNNN-${typeRecordNumber}-COIII-010000`;
  } else if (newRecord.formId === 'CableHarnessShipment') {
    newRecord.data.componentName = `${newRecord.formName} ${typeRecordNumber} (${newRecord.data.boardUuiDs.length}.${newRecord.validity.startDate.toISOString().substring(0, 10)})`;
    newRecord.data.dunePid = `D003MMMNNNNN-${typeRecordNumber}-COIII-010000`;
  } else if (newRecord.formId === 'DWAComponentShipment') {
    newRecord.data.componentName = `${newRecord.formName} (${utils.dictionary_locations[newRecord.data.originOfShipment]}.${utils.dictionary_locations[newRecord.data.destinationOfShipment]})`;
    newRecord.data.dunePid = `D003MMMNNNNN-${typeRecordNumber}-COIII-010000`;
  } else if (newRecord.formId === 'GBiasBoardShipment') {
    newRecord.data.componentName = `${newRecord.formName} ${typeRecordNumber} (${newRecord.data.boardUuiDs.length}.${newRecord.validity.startDate.toISOString().substring(0, 10)})`;
    newRecord.data.dunePid = `D003MMMNNNNN-${typeRecordNumber}-COIII-010000`;
  } else if (newRecord.formId === 'GeometryBoardShipment') {
    newRecord.data.componentName = `${newRecord.formName} (${newRecord.data.boardUuiDs.length}.${utils.dictionary_locations[newRecord.data.originOfShipment]}.${utils.dictionary_locations[newRecord.data.destinationOfShipment]})`;
    newRecord.data.dunePid = `D003MMMNNNNN-${typeRecordNumber}-COIII-010000`;
  } else if (newRecord.formId === 'GroundingMeshPanelShipment') {
    newRecord.data.componentName = `${newRecord.formName} (${newRecord.data.apaUuiDs.length}.${utils.dictionary_locations[newRecord.data.originOfShipment]}.${utils.dictionary_locations[newRecord.data.destinationOfShipment]})`;
    newRecord.data.dunePid = `D003MMMNNNNN-${typeRecordNumber}-COIII-010000`;
  } else if (newRecord.formId === 'PopulatedBoardShipment') {
    newRecord.data.componentName = `${newRecord.formName} ${typeRecordNumber} (${utils.dictionary_locations[newRecord.data.originOfShipment]}.${utils.dictionary_locations[newRecord.data.destinationOfShipment]})`;
    newRecord.data.dunePid = `D003MMMNNNNN-${typeRecordNumber}-COIII-010000`;
  } else if (newRecord.formId === 'SHVBoardShipment') {
    newRecord.data.componentName = `${newRecord.formName} ${typeRecordNumber} (${newRecord.data.boardUuiDs.length}.${newRecord.validity.startDate.toISOString().substring(0, 10)})`;
    newRecord.data.dunePid = `D003MMMNNNNN-${typeRecordNumber}-COIII-010000`;
  } else if (newRecord.formId === 'YokeShipment') {
    newRecord.data.componentName = `${newRecord.formName} (${newRecord.data.yokeUuiDs.length}.${utils.dictionary_locations[newRecord.data.originOfShipment]}.${utils.dictionary_locations[newRecord.data.destinationOfShipment]})`;
    newRecord.data.dunePid = `D003MMMNNNNN-${typeRecordNumber}-COIII-010000`;
  }

  // Insert the new record into the 'components' records collection, and throw an error if the insertion fails
  let _lock = await dbLock(`saveComponent_${newRecord.componentUuid}`, 1000);

  const result = await db.collection('components')
    .insertOne(newRecord);

  _lock.release();

  if (!result.acknowledged) throw new Error(`Components::save() - failed to insert a new component record into the database!`);

  // Once the component record has been successfully saved, deal with the reception information for any related components:
  // - for an 'Assembled APA', update the reception information of the underlying 'APA Frame' to indicate that it is now being used
  // - for an 'Assembled APA Shipment', update the reception information of the underlying 'Assembled APA' and 'ASF' components to be the same as the shipment
  //    (they should already be at the same location as the shipment, but this is a double-check on that)
  // - for other types of shipment, update the reception information of the various sub-components to indicate that they are in transit
  // - for a 'Populated Board Shipment', update the reception information of the various sub-components to indicate that they are at Wisconsin (where the kit is put together)
  // - for a 'Return Geometry Board Batch', update the reception information of the individual geometry board sub-components to indicate they are at Lancaster (where the batch is put together)
  // In all cases, if successful, the updating function returns 'result = 1' in all cases, but we don't actually use this value anywhere
  if ((newRecord.formId === 'APAFrameShipment') || (newRecord.formId === 'DWAComponentShipment') || (newRecord.formId === 'GeometryBoardShipment') || (newRecord.formId === 'GroundingMeshPanelShipment') || (newRecord.formId === 'PopulatedBoardShipment') || (newRecord.formId === 'YokeShipment')) {
    const result = await updateLocations_inShipment(newRecord.componentUuid, 'in_transit', (new Date()).toISOString().slice(0, 10));
  } else if (newRecord.formId === 'AssembledAPA') {
    const result = await updateLocation(newRecord.data.frameUuid, 'installed_on_APA', (new Date()).toISOString().slice(0, 10), newRecord.componentUuid);
  } else if (newRecord.formId === 'AssembledAPAShipment') {
    const result = await updateLocations_inShipment(newRecord.componentUuid, newRecord.reception.location, (new Date()).toISOString().slice(0, 10));
  } else if (newRecord.formId === 'ReturnedGeometryBoardBatch') {
    for (const board of newRecord.data.boardUuids) {
      const result = await updateLocation(board.component_uuid, 'lancaster', (new Date()).toISOString().slice(0, 10), '');
    }
  }

  // If the insertion and post-insertion changes are all successful, return the record's component UUID (in string format) as confirmation
  return MUUID.from(newRecord.componentUuid).toString();
}


/// Update the most recently logged reception information of a single component
async function updateLocation(componentUuid, location, date, detail) {
  // The reception information should NOT be changed in the following situations:
  //  - if the location is currently set to 'installed_on_APA' ... this can happen in the following circumstances:
  //      * if a geometry board shipment is being retroactively received
  //      * when a board installation action has previously been only partially completed, and is now being edited with additional board entries

  // First retrieve the component's record, then check for the current location, and only proceed to change the reception information if we are NOT in one of the situations described above
  const component = await retrieve(componentUuid);
  let currentLocation = 'null object';

  if (component.reception != null) {
    currentLocation = component.reception.location;
  }

  if (currentLocation !== 'installed_on_APA') {
    // Set up the DB query match condition to be that a record's component UUID must match the specified one
    let match_condition = { componentUuid };

    if (typeof componentUuid === 'object' && !(componentUuid instanceof Binary)) match_condition = componentUuid;

    match_condition.componentUuid = MUUID.from(match_condition.componentUuid);

    // Use the MongoDB '$set' operator to directly edit the values of the relevant fields in ALL matching component records (i.e. all versions of the component), and throw an error if the edit fails
    const result = await db.collection('components')
      .updateMany(
        match_condition,
        [
          {
            $set: {
              'reception.location': location,
              'reception.date': date,
              'reception.detail': detail,
            }
          },
        ]
      );

    if (result.ok === 0) throw new Error(`Components::updateLocation() - failed to update the component record!`);

    // If the edit is successful, return the status of the 'result.ok' property (which should be 1)
    return result.ok;
  }

  return 1;
}


/// Update the location of an already-installed geometry board to reflect removal from an Assembled APA
async function updateLocation_geoBoardRemoval(componentUuid, location, date, detail) {
  // This function operates in essentially the same way as the 'updateLocation' function, but is used specifically for updating the location of a board to show that it has been removed from an APA
  // The 'updateLocation' function does not allow that to happen, since it safeguards against changing the location of any component with a current location of 'installed_on_APA'

  // Set up the DB query match condition to be that a record's component UUID must match the specified one
  let match_condition = { componentUuid };

  if (typeof componentUuid === 'object' && !(componentUuid instanceof Binary)) match_condition = componentUuid;

  match_condition.componentUuid = MUUID.from(match_condition.componentUuid);

  // Use the MongoDB '$set' operator to directly edit the values of the relevant fields in ALL matching component records (i.e. all versions of the component), and throw an error if the edit fails
  const result = await db.collection('components')
    .updateMany(
      match_condition,
      [
        {
          $set: {
            'reception.location': location,
            'reception.date': date,
            'reception.detail': detail,
          }
        },
      ]
    );

  if (result.ok === 0) throw new Error(`Components::updateLocation_geoBoardRemoval() - failed to update the component record!`);

  // If the edit is successful, return the status of the 'result.ok' property (which should be 1)
  return result.ok;
}


/// Update the most recently logged reception locations and dates of all sub-components in a shipment-type component
async function updateLocations_inShipment(componentUuid, location, date) {
  // Retrieve the most recent version of the shipment-like component record corresponding to the specified component UUID
  const shipment = await retrieve(componentUuid);

  // Loop over all sub-components in the shipment, and update each one's location information appropriately for the shipment type and contents
  // In all cases, if successful, the updating function returns 'result = 1', but we don't actually use this value anywhere
  if (shipment.formId === 'APAFrameShipment') {
    // Extract the UUID and update the location information of each APA frame in a shipment of frames
    for (const frame of shipment.data.frameUuiDs) {
      const result = await updateLocation(frame.component_uuid, location, date, '');
    }
  } else if (shipment.formId === 'AssembledAPAShipment') {
    // Extract the UUID and update the location information of each assembled APA and the ASF in a shipment of APAs
    for (const apa of shipment.data.apaUuiDs) {
      const result = await updateLocation(apa.component_uuid, location, date, '');
    }

    const result = await updateLocation(shipment.data.asfUuid, location, date, '');
  } else if ((shipment.formId === 'CEAdapterBoardShipment') || (shipment.formId === 'CRBoardShipment') || (shipment.formId === 'CableHarnessShipment') || (shipment.formId === 'GBiasBoardShipment') || (shipment.formId === 'GeometryBoardShipment') || (shipment.formId === 'SHVBoardShipment')) {
    // Extract the UUID and update the location information of each board in a shipment of (single type) boards
    for (const board of shipment.data.boardUuiDs) {
      const result = await updateLocation(board.component_uuid, location, date, '');
    }
  } else if (shipment.formId === 'DWAComponentShipment') {
    // Extract the UUID and update the location information of each component in a (combined) shipment of DWAs and DWAPDBs
    for (const dwa of shipment.data.componentUUIDs) {
      const result = await updateLocation(dwa.component_uuid, location, date, '');
    }
  } else if (shipment.formId === 'GroundingMeshPanelShipment') {
    // Extract the UUID and update the location information of each mesh in a shipment of meshes
    for (const mesh of shipment.data.apaUuiDs) {
      const result = await updateLocation(mesh.component_uuid, location, date, '');
    }
  } else if (shipment.formId === 'PopulatedBoardShipment') {
    // Extract the UUID and update the location information of each shipment in a multi-type populated board shipment
    for (const crBoardShipment of shipment.data.crBoardKitUuiDs) {
      if (crBoardShipment.component_uuid !== '') {
        const result = await updateLocations_inShipment(crBoardShipment.component_uuid, location, date);
      }
    }

    for (const gBiasBoardShipment of shipment.data.gBiasBoardKitUuiDs) {
      if (gBiasBoardShipment.component_uuid !== '') {
        const result = await updateLocations_inShipment(gBiasBoardShipment.component_uuid, location, date);
      }
    }

    for (const shvBoardShipment of shipment.data.shvBoardKitUuiDs) {
      if (shvBoardShipment.component_uuid !== '') {
        const result = await updateLocations_inShipment(shvBoardShipment.component_uuid, location, date);
      }
    }

    for (const cableHarnessShipment of shipment.data.cableHarnessKitUuiDs) {
      if (cableHarnessShipment.component_uuid !== '') {
        const result = await updateLocations_inShipment(cableHarnessShipment.component_uuid, location, date);
      }
    }
  } else if (shipment.formId === 'YokeShipment') {
    // Extract the UUID and update the location information of each yoke in a shipment of yokes
    for (const yoke of shipment.data.yokeUuiDs) {
      const result = await updateLocation(yoke.component_uuid, location, date, '');
    }
  }

  // Update the location information of the shipment itself
  const result = await updateLocation(componentUuid, location, date, '');

  // Return the final result (which should be 1)
  return result;
}


/// Retrieve a single version of a component record (either the most recent, or a specified one)
async function retrieve(componentUuid, projection) {
  // Set up the DB query match condition to be that a record's component UUID must match the specified one, and throw an error if no component UUID has been specified
  let match_condition = { componentUuid };

  if (typeof componentUuid === 'object' && !(componentUuid instanceof Binary)) match_condition = componentUuid;

  if (!match_condition.componentUuid) throw new Error(`Components::retrieve(): the 'componentUuid' has not been specified!`);

  // Attempt to set the match condition to the specified UUID (in binary format), and return 'null' if the string-to-binary conversion fails
  try {
    match_condition.componentUuid = MUUID.from(match_condition.componentUuid);
  } catch (e) { return null; }

  // Set up any additional options that have been specified via the 'projection' argument
  let options = {};

  if (projection) options.projection = projection;

  // Query the 'components' records collection for records matching the match condition and additional options
  // Then sort any matching records such that the most recent version is first in the list
  let records = await db.collection('components')
    .find(match_condition, options)
    .sort({ 'validity.version': -1 })
    .toArray();

  // If there is at least one matching record ...
  if (records.length > 0) {
    // Convert the 'componentUuid' of the first matching record from binary to string format, for better readability and consistent display
    records[0].componentUuid = MUUID.from(records[0].componentUuid).toString();

    // Return the first matching record
    return records[0];
  }

  // If there are no matching records (i.e. the whole of the 'if' statement above is skipped), simply return 'null'
  return null;
}


/// Retrieve all versions of a component record
async function versions(componentUuid) {
  // Set up the DB query match condition to be that a record's component UUID must match the specified one, and throw an error if no component UUID has been specified
  let match_condition = { componentUuid };

  if (typeof componentUuid === 'object' && !(componentUuid instanceof Binary)) match_condition = componentUuid;

  if (!match_condition.componentUuid) throw new Error(`Components::versions(): the 'componentUuid' has not been specified!`);

  // Attempt to set the match condition to the specified UUID (in binary format), and return 'null' if the string-to-binary conversion fails
  try {
    match_condition.componentUuid = MUUID.from(match_condition.componentUuid);
  } catch (e) { return null; }

  // Query the 'components' records collection for records matching the match condition
  // Then sort any matching records such that the most recent version is first in the list
  let records = await db.collection('components')
    .find(match_condition)
    .sort({ 'validity.version': -1 })
    .toArray();

  // Convert the 'componentUuid' of each matching record from binary to string format, for better readability and consistent display
  for (let record of records) {
    record.componentUuid = MUUID.from(record.componentUuid).toString();
  }

  // Return the entire list of matching records
  return records;
}


/// Retrieve a list of component records matching a specified condition
async function list(match_condition, options) {
  let aggregation_stages = [];

  // If a matching condition has been specified, set it as the first aggregation stage
  // If the matching condition additionally contains a (string format) component UUID, first convert it to binary format
  if (match_condition) {
    if (match_condition.componentUuid) {
      if (match_condition.componentUuid['$in']) match_condition.componentUuid['$in'] = match_condition.componentUuid['$in'].map(x => MUUID.from(x));
    }

    aggregation_stages.push({ $match: match_condition });
  }

  // Keep only the minimal required fields from each record for subsequent aggregation stages (this reduces memory usage)
  aggregation_stages.push({
    $project: {
      componentUuid: true,
      formId: true,
      formName: true,
      data: true,
      validity: true,
      reception: true,
    }
  })

  // Select only the latest version of each record
  // First sort the matching records by validity ... highest version first
  // Then group the records by the component UUID (i.e. each group contains all versions of the same component), and select only the first (highest version number) entry in each group
  // Finally, set which fields in the first record are to be returned for use in subsequent aggregation stages
  aggregation_stages.push({ $sort: { 'validity.version': -1 } });
  aggregation_stages.push({
    $group: {
      _id: { componentUuid: '$componentUuid' },
      componentUuid: { '$first': '$componentUuid' },
      typeFormId: { '$first': '$formId' },
      typeFormName: { '$first': '$formName' },
      data: { '$first': '$data' },
      componentName: { '$first': '$data.componentName' },
      lastEditDate: { '$first': '$validity.startDate' },
      reception: { '$first': '$reception' },
    },
  });

  // Re-sort the records ... by (alphanumerical) component name for APA Frames, ASFs and Assembled APAs, or by last edit date (most recent first) for other component types
  if ((match_condition) && (match_condition.formId) && (['APAFrame', 'APAShippingFrame', 'AssembledAPA'].includes(match_condition.formId))) {
    aggregation_stages.push({ $sort: { componentName: -1 } });
  } else {
    aggregation_stages.push({ $sort: { lastEditDate: -1 } });
  }

  // Add aggregation stages for any additionally specified options
  if (options) {
    if (options.limit) aggregation_stages.push({ $limit: options.limit });
  }

  // Query the 'components' records collection using the aggregation stages defined above
  let records = await db.collection('components')
    .aggregate(aggregation_stages)
    .toArray();

  // Convert the 'componentUuid' of each matching record from binary to string format, for better readability and consistent display
  for (let record of records) {
    record.componentUuid = MUUID.from(record.componentUuid).toString();
  }

  // Return the entire list of matching records
  return records;
}


/// Get a list of component counts per type across all existing component types
async function counts_byType() {
  let aggregation_stages = [];

  // Group the records by the type form ID and component UUID, so that each group represents all records with the same [component type, component UUID] combination
  // This is an alternative approach to selecting only the most recent version of a single component ... since we don't need the individual versions, they can all be represented by a single group
  aggregation_stages.push({
    $group: {
      _id: {
        formId: '$formId',
        componentUuid: '$componentUuid',
      },
    },
  });

  // Re-group the records by the type form ID, so that each group now represents all of the previous 'single UUID' groups with the same component type
  // Then determine the 'count' - i.e. how many records are in each group
  aggregation_stages.push({
    $group: {
      _id: '$_id.formId',
      count: { $sum: 1 },
    },
  });

  // Flatten the returned groups by projecting the 'formId' group ID directly (along with the 'count'), and not projecting the group ID object
  aggregation_stages.push({
    $project: {
      formId: '$_id',
      count: true,
      _id: false,
    },
  });

  // Query the 'components' records collection using the aggregation stages defined above
  let records = await db.collection('components')
    .aggregate(aggregation_stages)
    .toArray();

  // Reform the query results into an object, with each entry keyed by the type form ID
  let keyedRecords = {};

  for (const record of records) {
    keyedRecords[record.formId] = record;
  }

  // Retrieve an object containing all component type forms, with each entry keyed by the type form ID
  // Then, for each type form, copy the component count from the entry in the results object (if it exists) into the corresponding entry in the type forms object
  let typeFormsList = await Forms.list('componentForms');

  for (const formId of Object.keys(typeFormsList)) {
    if (keyedRecords.hasOwnProperty(formId)) typeFormsList[formId].count = keyedRecords[formId].count;
  }

  // Return the type forms object
  return typeFormsList;
}


/// Get a list of geometry board counts across all [board part number, board location] combinations
/// This function is intended to be used ONLY for 'Geometry Board' type components, and therefore does not take any user-specified arguments
async function boardCounts_byPartNumberAndLocation() {
  let aggregation_stages = [];

  // Match against the type form ID to get records of all components of the single specified component type
  aggregation_stages.push({ $match: { formId: 'GeometryBoard' } });

  // Keep only the minimal required fields from each record for subsequent aggregation stages (this reduces memory usage)
  aggregation_stages.push({
    $project: {
      componentUuid: true,
      data: true,
      reception: true,
      validity: true,
    }
  })

  // Select only the latest version of each record
  // First sort the matching records by validity ... highest version first
  // Then group the records by the component UUID (i.e. each group contains all versions of the same component), and select only the first (highest version number) entry in each group
  // Finally, set which fields in the first record are to be returned for use in subsequent aggregation stages
  aggregation_stages.push({ $sort: { 'validity.version': -1 } });
  aggregation_stages.push({
    $group: {
      _id: { componentUuid: '$componentUuid' },
      componentUuid: { '$first': '$componentUuid' },
      partNumber: { '$first': '$data.partNumber' },
      location: { '$first': '$reception.location' },
    },
  });

  // Group the records by the part number and location, so that each group represents all records with the same [part number, location] combination
  // Then determine the 'count' - i.e. how many records are in each group
  aggregation_stages.push({
    $group: {
      _id: {
        partNumber: '$partNumber',
        location: '$location',
      },
      count: { $sum: 1 },
    },
  });

  // Flatten the returned groups by projecting the group IDs directly (along with the 'count'), and not projecting the group ID object
  aggregation_stages.push({
    $project: {
      partNumber: '$_id.partNumber',
      location: '$_id.location',
      count: true,
      _id: false,
    },
  });

  // Query the 'components' records collection using the aggregation stages defined above
  let records = await db.collection('components')
    .aggregate(aggregation_stages)
    .toArray();

  // Return the list of grouped records
  return records;
}


/// Auto-complete a component UUID string as it is being typed
/// This function actually returns a list of component records with matching component UUIDs to that being typed
async function autoCompleteUuid(inputString, limit = 10) {
  // Remove any underscores and dashes from the input string
  let q = inputString.replace(/[_-]/g, '');

  // Calculate the minimum and maximum possible binary values of the input string
  // The component UUID is 32 alphanumeric characters long (excluding dashes), so the minimum value is given by the input string padded out to this length with '0' characters, and the maximum by padding using 'F' characters
  const bitlow = new Binary(Buffer.from(q.padEnd(32, '0'), 'hex'), Binary.SUBTYPE_UUID);
  const bithigh = new Binary(Buffer.from(q.padEnd(32, 'F'), 'hex'), Binary.SUBTYPE_UUID);

  let aggregation_stages = [];

  /// Set up the DB query match condition to be that a record's component UUID must have a binary value between the minimum and maximum values calculated above
  let match_condition = {
    componentUuid: {
      $gte: bitlow,
      $lte: bithigh,
    },
  };

  aggregation_stages.push({ $match: match_condition });

  // Select only the latest version of each record
  // First sort the matching records by validity ... highest version first
  // Then group the records by the component UUID (i.e. each group contains all versions of the same component), and select only the first (highest version number) entry in each group
  // Finally, set which fields in the first record are to be returned for use in subsequent aggregation stages
  aggregation_stages.push({ $sort: { 'validity.version': -1 } });
  aggregation_stages.push({
    $group: {
      _id: { componentUuid: '$componentUuid' },
      componentUuid: { '$first': '$componentUuid' },
      typeFormName: { '$first': '$formName' },
      componentName: { '$first': '$data.componentName' },
      lastEditDate: { '$first': '$validity.startDate' },
    },
  });

  // Re-sort the records by last edit date ... most recent first
  aggregation_stages.push({ $sort: { lastEditDate: -1 } });

  // Limit the number of returned matching records, just so the interface doesn't get too busy
  aggregation_stages.push({ $limit: limit });

  // Query the 'components' records collection using the aggregation stages defined above
  let records = await db.collection('components')
    .aggregate(aggregation_stages)
    .toArray();

  // Convert the 'componentUuid' of each matching record from binary to string format, for better readability and consistent display
  for (let record of records) {
    record.componentUuid = MUUID.from(record.componentUuid).toString();
  }

  // Return the entire list of matching records
  return records;
}


module.exports = {
  newUuid,
  save,
  updateLocation,
  updateLocation_geoBoardRemoval,
  updateLocations_inShipment,
  retrieve,
  versions,
  list,
  counts_byType,
  boardCounts_byPartNumberAndLocation,
  autoCompleteUuid,
}
