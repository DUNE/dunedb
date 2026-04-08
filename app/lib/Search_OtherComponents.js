const MUUID = require('uuid-mongodb');

const Actions = require('./Actions');
const Components = require('./Components');
const { db } = require('./db');


/// Retrieve a list of geometry board shipments that match the specified reception details
async function geoBoardShipmentsByReceptionDetails(status, origin, destination, earliest, latest, comment) {
  // Set up 'matching' strings that can be used by MongoDB to match against specific record field values
  // For each potential location (origin or destination), if it has been specified, just use it as the matching string ... otherwise use a fully wildcard regular expression
  const originString = (origin) ? origin : /(.*?)/;
  const destinationString = (destination) ? destination : /(.*?)/;

  let comp_aggregation_stages = [];

  // Match against the type form ID and both locations to get records of all 'Geometry Board Shipment' components that were supposed to travel between the specified locations
  comp_aggregation_stages.push({
    $match: {
      'formId': 'GeometryBoardShipment',
      'data.originOfShipment': originString,
      'data.destinationOfShipment': destinationString,
    }
  });

  // Select the latest version of each record, and pass through only the fields required for later use
  comp_aggregation_stages.push({ $sort: { 'validity.version': -1 } });
  comp_aggregation_stages.push({
    $group: {
      _id: { componentUuid: '$componentUuid' },
      componentUuid: { '$first': '$componentUuid' },
      data: { '$first': '$data' },
      startDate: { '$first': '$validity.startDate' },
    },
  });

  // Query the 'components' records collection using the aggregation stages defined above
  let component_results = await db.collection('components')
    .aggregate(comp_aggregation_stages)
    .toArray();

  // At this point, we have a list of 'Geometry Board Shipment' component records that:
  //   - originated at the specified origin location (if one was specified), or at any location (if not)
  //   - were supposed to end up at the specified destination location (if one was specified), or at any location (if not)
  // But what we actually want is a combination of some information from both the shipment component record and the corresponding reception action record (if the shipment has been received)
  let shipments = [];

  // For each shipment record ...
  for (const shipmentRecord of component_results) {
    let action_aggregation_stages = [];

    // Match against the type form ID and component UUID to get records of all 'Board Reception' actions performed on the specified geometry board shipment component
    action_aggregation_stages.push({
      $match: {
        'typeFormId': 'BoardReception',
        'componentUuid': shipmentRecord.componentUuid,
      }
    });

    // Select the latest version of each record, and pass through only the fields required for later use
    action_aggregation_stages.push({ $sort: { 'validity.version': -1 } });
    action_aggregation_stages.push({
      $group: {
        _id: { actionId: '$actionId' },
        actionId: { '$first': '$actionId' },
        componentUuid: { '$first': '$componentUuid' },
        data: { '$first': '$data' },
      },
    });

    // Query the 'actions' records collection using the aggregation stages defined above
    let action_results = await db.collection('actions')
      .aggregate(action_aggregation_stages)
      .toArray();

    // Set up the single shipment object that will contain the component information and any additional action information
    let shipment = {
      uuid: shipmentRecord.componentUuid,
      numberOfBoards: shipmentRecord.data.boardUuiDs.length,
      creationDate: (shipmentRecord.startDate.toISOString().split('T'))[0],
      origin: shipmentRecord.data.originOfShipment,
      destination: shipmentRecord.data.destinationOfShipment,
      receptionDate: '[n.a.]',
      receptionActionId: '[n.a.]',
      receptionComment: '[n.a.]',
      searchComment: '[n.a.]',
    }

    // Now set up some logic to handling matching the shipment reception date against any specified earliest or latest date query (or a combination of both)
    // First set up the JavaScript 'Date' objects for use in the comparison, with values dependent on if the earliest and/or latest dates were specified or not
    const earliestDate = (earliest) ? new Date(earliest) : new Date('2000-01-01');
    const latestDate = (latest) ? new Date(latest) : new Date();

    // If there are no matching reception action records, this indicates that this shipment has not yet been received (i.e. perhaps it is still in transit)
    // If the search query is for unreceived shipments, we can save this shipment object for return as-is
    // If the search query is not for unreceived shipments (i.e. it is for received shipments), we don't care about this shipment
    if (action_results.length === 0) {
      if (status === 'unreceived') shipments.push(shipment);
    }

    // If there is (at least) one matching reception action record, this indicates that this shipment has been recorded as being received somewhere
    // If the search query is for received shipments, add the reception information to the shipment object if:
    //   - either a date range query has not been specified, 
    //   - or a date range query has been specified, and the record's reception date matches to it

    // The same logic can be used for if there is more than one matching reception action record ...
    // ... such a scenario would indicate that this shipment has been received more than once, which shouldn't happen, but technically speaking there is nothing preventing it
    // In such a situation, an additional comment should be added to the returned shipment object to notify the user
    // Also, check that the actual reception location matches the intended destination ... if not, add a comment to notify the user
    else {
      if (status === 'received') {
        const receptionDate = new Date(((action_results[0].data.receptionDate).split('T'))[0]);

        if ((!earliest && !latest) || ((earliest || latest) && (receptionDate >= earliestDate) && (receptionDate <= latestDate))) {
          shipment.receptionDate = (receptionDate.toISOString().split('T'))[0];
          shipment.receptionActionId = action_results[0].actionId;
          shipment.receptionComment = action_results[0].data.comments;

          if (action_results.length === 1) {
            shipment.searchComment = '';
          }
          else {
            shipment.searchComment = 'Multiple reception records!';
          }

          if (shipment.destination !== action_results[0].data.receptionLocation) shipment.searchComment = 'Reception destination mismatch!';

          // Once the shipment object is fully populated with reception information, we can check against any specified reception comment query ... there are three scenarios to consider:
          //   - if the query is 'null', this indicates that we don't care what the reception comment is, so just save the shipment object for return
          //   - if the query is a 'noComment' string, save the shipment object only if the reception comment is explicitly an empty string
          //   - if the query is a 'comment' string, save the shipment object only if the reception comment is explicitly NOT an empty string
          if (!comment) shipments.push(shipment);
          else {
            if (((comment === 'noComment') && (shipment.receptionComment === ''))
              || ((comment === 'comment') && (shipment.receptionComment !== ''))) shipments.push(shipment);
          }
        }
      }
    }
  }

  // Return the list of shipments
  return shipments;
}


/// Retrieve a list of geometry board shipments that reference a single component, specified by its UUID
async function geoBoardShipmentsByBoardUUID(componentUUID) {
  let aggregation_stages = [];

  // Match against the type form ID to get records of all 'Geometry Board Shipment' components
  aggregation_stages.push({ $match: { 'formId': 'GeometryBoardShipment' } });

  // Select the latest version of each record, and pass through only the fields required for later use
  aggregation_stages.push({ $sort: { 'validity.version': -1 } });
  aggregation_stages.push({
    $group: {
      _id: { componentUuid: '$componentUuid' },
      componentUuid: { '$first': '$componentUuid' },
      typeFormId: { '$first': '$formId' },
      typeFormName: { '$first': '$formName' },
      data: { '$first': '$data' },
      reception: { '$first': '$reception' },
      lastEditDate: { '$first': '$validity.startDate' },
    },
  });

  // Match against the specified component UUID
  // Since the component UUIDs are stored as an ARRAY in the shipment record, this requires first unwinding the array (to temporarily produce a single record per array entry)
  aggregation_stages.push({ $unwind: '$data.boardUuiDs' });

  aggregation_stages.push({
    $match: { 'data.boardUuiDs.component_uuid': MUUID.from(componentUUID).toString() }
  });

  // Query the 'components' records collection using the aggregation stages defined above
  let shipments = await db.collection('components')
    .aggregate(aggregation_stages)
    .toArray();

  // Return the list of shipments
  return shipments;
}


/// Retrieve a list of assembled APAs that match the specified production location and number
async function apasByProductionLocationAndNumber(location, number) {
  let aggregation_stages = [];

  // Match against the type form ID to get records of all 'Assembled APA' components
  aggregation_stages.push({
    $match: {
      'formId': 'AssembledAPA',
    }
  });

  // Select the latest version of each record, and pass through only the fields required for later use
  aggregation_stages.push({ $sort: { 'validity.version': -1 } });
  aggregation_stages.push({
    $group: {
      _id: { componentUuid: '$componentUuid' },
      componentUuid: { '$first': '$componentUuid' },
      data: { '$first': '$data' },
    },
  });

  // Match against the specified APA assembly location and production number
  aggregation_stages.push({
    $match: {
      'data.apaAssemblyLocation': location,
      'data.typeRecordNumber': parseInt(number, 10),
    }
  });

  // Query the 'components' records collection using the aggregation stages defined above
  let results = await db.collection('components')
    .aggregate(aggregation_stages)
    .toArray();

  // Return the list of assembled APAs
  return results;
}


/// Retrieve lists of all assembled APAs that have and have not been completed up to and including the specified step in their assembly workflows
async function apasByProductionLocationAndAssemblyStep(location, assemblyStep) {
  let action_aggregation_stages = [];

  // Depending on which assembly step string has been passed to this function, match against the type form ID to get:
  // ... either records of all 'Assembled APA QA Check' actions that have been performed and completed at the specified assembly step
  // ... or records of all 'Completed APA QA Checklist' actions that have been performed and completed
  let match_condition = {};

  if (assemblyStep === 'assemblyComplete') {
    match_condition = {
      'typeFormId': 'CompletedAPAQCChecklist',
      'data.actionComplete': true,
    };
  } else {
    match_condition = {
      'typeFormId': 'AssembledAPAQACheck',
      'data.workflowSectionBeingQAed': assemblyStep,
      'data.actionComplete': true,
    };
  }

  action_aggregation_stages.push({ $match: match_condition });

  // Select the latest version of each record, and pass through only the fields required for later use
  // Then sort the records reverse alphabetically by the 'componentName' field
  action_aggregation_stages.push({ $sort: { 'validity.version': -1 } });
  action_aggregation_stages.push({
    $group: {
      _id: { actionId: '$actionId' },
      actionId: { '$first': '$actionId' },
      componentUuid: { '$first': '$componentUuid' },
      componentName: { '$first': '$componentName' },
    },
  });

  action_aggregation_stages.push({ $sort: { 'componentName': -1 } });

  // Query the 'actions' records collection using the aggregation stages defined above
  let apasCompletedToStep_allLocations = await db.collection('actions')
    .aggregate(action_aggregation_stages)
    .toArray();

  // At this point, we have a list of completed 'Assembled APA QA Check' or 'Completed APA QA Checklist' action records
  // But we actually want a list of the Assembled APA components that have been produced at the specified location and on which these actions have been performed
  // Loop over the action records, retrieve the associated component record, and add the desired information to each record if the APA production location matches the specified one
  let apasCompletedToStep_atLocation = [];
  let uuids_apasCompletedToStep_atLocation = []

  for (let action of apasCompletedToStep_allLocations) {
    const component = await Components.retrieve(MUUID.from(action.componentUuid).toString());

    if (component.data.apaAssemblyLocation === location) {
      uuids_apasCompletedToStep_atLocation.push(action.componentUuid);

      action.workflowId = component.workflowId;

      apasCompletedToStep_atLocation.push(action);
    }
  }

  let comp_aggregation_stages = [];

  // Now we also want a list of the Assembled APA components that have been produced at the specified location and on which these actions have NOT been performed
  // Match against the type form ID, component UUID and production location to get records of all 'Assembled APA' components that have a UUID that is NOT in the previously constructed list
  comp_aggregation_stages.push({
    $match: {
      'formId': 'AssembledAPA',
      'componentUuid': { $nin: uuids_apasCompletedToStep_atLocation },
      'data.apaAssemblyLocation': location,
    }
  });

  // Select the latest version of each record, and pass through only the fields required for later use
  // Then sort the records reverse alphabetically by the 'componentName' field
  comp_aggregation_stages.push({ $sort: { 'validity.version': -1 } });
  comp_aggregation_stages.push({
    $group: {
      _id: { componentUuid: '$componentUuid' },
      componentUuid: { '$first': '$componentUuid' },
      workflowId: { '$first': '$workflowId' },
      componentName: { '$first': '$data.componentName' },
    },
  });

  comp_aggregation_stages.push({ $sort: { 'componentName': -1 } });

  // Query the 'components' records collection using the aggregation stages defined above
  let apasNotCompletedToStep_atLocation = await db.collection('components')
    .aggregate(comp_aggregation_stages)
    .toArray();

  // Return a nested list, consisting of:
  // - [0] the list of all assembled APAs produced at the specified location that have had matching 'Assembled APA QA Check'  or 'Completed APA QA Checklist' actions performed on them and completed
  // - [1] the list of all assembled APAs that have NOT had such actions performed on them and/or completed
  return [apasCompletedToStep_atLocation, apasNotCompletedToStep_atLocation];
}


/// Retrieve a list of components that match the specified DUNE PID
async function componentsByDUNEPID(dunePID) {
  let aggregation_stages = [];

  // Match against the DUNE PID to get records of all components that have the same name as the specified one
  aggregation_stages.push({
    $match: { 'data.dunePid': dunePID }
  });

  // Select the latest version of each record, and pass through only the fields required for later use
  aggregation_stages.push({ $sort: { 'validity.version': -1 } });
  aggregation_stages.push({
    $group: {
      _id: { componentUuid: '$componentUuid' },
      componentUuid: { '$first': '$componentUuid' },
    },
  });

  // Query the 'components' records collection using the aggregation stages defined above
  let results = await db.collection('components')
    .aggregate(aggregation_stages)
    .toArray();

  // Return the list of components
  return results;
}


/// Retrieve a list of components that match the specified type and type record number
async function componentsByTypeAndNumber(typeFormId, typeRecordNumber) {
  let aggregation_stages = [];

  // Match against the type form ID and type record number to get records of all components that have the same type and number as the specified ones
  aggregation_stages.push({
    $match: {
      'formId': typeFormId,
      'data.typeRecordNumber': parseInt(typeRecordNumber, 10),
    }
  });

  // Select the latest version of each record, and pass through only the fields required for later use
  aggregation_stages.push({ $sort: { 'validity.version': -1 } });
  aggregation_stages.push({
    $group: {
      _id: { componentUuid: '$componentUuid' },
      componentUuid: { '$first': '$componentUuid' },
      componentName: { '$first': '$data.componentName' },
      typeRecordNumber: { '$first': '$data.typeRecordNumber' },
      formName: { '$first': '$formName' },
      shortUuid: { '$first': '$shortUuid' },
      data: { '$first': '$data' },
    },
  });

  // Sort the records into alphabetical order by the component name
  aggregation_stages.push({ $sort: { componentName: 1 } });

  // Query the 'components' records collection using the aggregation stages defined above
  let results = await db.collection('components')
    .aggregate(aggregation_stages)
    .toArray();

  // Return the list of components
  return results;
}


/// Retrieve a list of components that match the specified type and that are at a specified location
async function componentsByTypeAndLocation(typeFormId, location, toothStripStatus, conformanceStatus, qaChecksStatus) {
  let aggregation_stages = [];

  // Allow for a 'null' location to be specified, to make debugging of components with missing locations easier
  if (location == 'none') location = null;

  // Match against the type form ID and location to get records of all components of the specified type at the specified location
  aggregation_stages.push({
    $match: {
      'formId': typeFormId,
      'reception.location': location,
    }
  });

  // Select the latest version of each record, and pass through only the fields required for later use (dependent on the specified component type)
  aggregation_stages.push({ $sort: { 'validity.version': -1 } });

  if (typeFormId === 'GeometryBoard') {
    aggregation_stages.push({
      $group: {
        _id: { componentUuid: '$componentUuid' },
        partNumber: { '$first': '$data.partNumber' },
        partString: { '$first': '$data.partString' },
        componentUuid: { '$first': '$componentUuid' },
        typeRecordNumber: { '$first': '$data.typeRecordNumber' },
      },
    });
  } else if (typeFormId === 'GroundingMeshPanel') {
    aggregation_stages.push({
      $group: {
        _id: { componentUuid: '$componentUuid' },
        partNumber: { '$first': '$data.meshPanelPartNumber' },
        componentUuid: { '$first': '$componentUuid' },
        typeRecordNumber: { '$first': '$data.typeRecordNumber' },
      },
    });
  } else {
    aggregation_stages.push({
      $group: {
        _id: { componentUuid: '$componentUuid' },
        componentUuid: { '$first': '$componentUuid' },
        typeRecordNumber: { '$first': '$data.typeRecordNumber' },
        data: { '$first': '$data' },
      },
    });
  }

  aggregation_stages.push({ $sort: { 'typeRecordNumber': 1 } });

  // For populated boards, match against the board conformance if it has been specified
  if (['CEAdapterBoard', 'CRBoard', 'GBiasBoard', 'SHVBoard'].includes(typeFormId) && (conformanceStatus !== 'any')) {
    aggregation_stages.push({
      $match: {
        'data.boardIsConformant': conformanceStatus,
      }
    });
  }

  // If the specified component type has an internal part number, group the records according to this, and pass through the fields required for later use
  // Then sort the record groups to be in numerical order of the part number
  // If the component type does not have an internal part number, no grouping needs to be performed
  if (typeFormId === 'GeometryBoard') {
    aggregation_stages.push({
      $group: {
        _id: {
          partNumber: '$partNumber',
          partString: '$partString',
        },
        componentUuid: { $push: '$componentUuid' },
      }
    });

    aggregation_stages.push({ $sort: { '_id.partNumber': 1 } });
  } else if (typeFormId === 'GroundingMeshPanel') {
    aggregation_stages.push({
      $group: {
        _id: {
          partNumber: '$partNumber',
        },
        componentUuid: { $push: '$componentUuid' },
      }
    });

    aggregation_stages.push({ $sort: { '_id.partNumber': 1 } });
  }

  // Query the 'components' records collection using the aggregation stages defined above
  let results = await db.collection('components')
    .aggregate(aggregation_stages)
    .toArray();

  // Reorganise the query results to make it easier to display them on the interface page ... the format of the reorganised results depends on the specified component type
  // Additionally for the 'Geometry Board' component type, filter the results based on the optional 'tooth strip attachment status' search parameter
  // Alternatively for any of the 'populated board' or 'Cable Harness' component types, filter the results based on the optional 'QA checks status' search parameters
  let cleanedResults = [];

  if (typeFormId === 'GeometryBoard') {
    for (const boardGroup of results) {
      let cleanedBoardGroup = {};

      cleanedBoardGroup.partNumber = boardGroup._id.partNumber;
      cleanedBoardGroup.partString = boardGroup._id.partString;

      cleanedBoardGroup.componentUuids = [];
      cleanedBoardGroup.ukids = [];
      cleanedBoardGroup.receptionDates = [];
      cleanedBoardGroup.installedOnAPA = [];

      for (const boardUuid of boardGroup.componentUuid) {
        let toothStripAttached = false;
        let includeBoard_basedOnToothStripStatus = false;

        match_condition = {
          typeFormId: 'BoardToothStripAttachment',
          componentUuid: MUUID.from(boardUuid).toString(),
        }

        const toothStripAttachmentActions = await Actions.list(match_condition);

        if (toothStripAttachmentActions.length > 0) toothStripAttached = true;

        if ((toothStripStatus === 'any') || ((toothStripStatus === 'attached') && (toothStripAttached == true)) || (toothStripStatus == 'notAttached') && (toothStripAttached == false)) {
          const board = await Components.retrieve(MUUID.from(boardUuid).toString());

          cleanedBoardGroup.componentUuids.push(MUUID.from(boardUuid).toString());
          cleanedBoardGroup.ukids.push(board.data.typeRecordNumber);

          if (board.reception) {
            cleanedBoardGroup.receptionDates.push(board.reception.date);
          } else {
            cleanedBoardGroup.receptionDates.push('[No Date Found!]');
          }

          if (location === 'installed_on_APA') {
            if (board.reception.detail) {
              const apa = await Components.retrieve(board.reception.detail);

              cleanedBoardGroup.installedOnAPA.push(apa.data.componentName);
            } else {
              cleanedBoardGroup.installedOnAPA.push('[No APA UUID found!]');
            }
          } else if (location === 'rejected') {
            if (board.reception.detail) {
              cleanedBoardGroup.installedOnAPA.push(board.reception.detail.substring(1, board.reception.detail.length - 1));
            } else {
              cleanedBoardGroup.installedOnAPA.push('[No rejection info!]');
            }
          } else {
            cleanedBoardGroup.installedOnAPA.push('[Not installed on APA]');
          }
        }
      }

      if (cleanedBoardGroup.componentUuids.length > 0) cleanedResults.push(cleanedBoardGroup);
    }
  } else if (typeFormId === 'GroundingMeshPanel') {
    for (const meshGroup of results) {
      let cleanedMeshGroup = {};

      cleanedMeshGroup.partNumber = meshGroup._id.partNumber;

      cleanedMeshGroup.componentUuids = [];
      cleanedMeshGroup.dunePids = [];
      cleanedMeshGroup.receptionDates = [];
      cleanedMeshGroup.installedOnAPA = [];

      for (const meshUuid of meshGroup.componentUuid) {
        const mesh = await Components.retrieve(MUUID.from(meshUuid).toString());

        cleanedMeshGroup.componentUuids.push(MUUID.from(meshUuid).toString());
        cleanedMeshGroup.dunePids.push(mesh.data.dunePid);

        if (mesh.reception) {
          cleanedMeshGroup.receptionDates.push(mesh.reception.date);
        } else {
          cleanedMeshGroup.receptionDates.push('[No Date Found!]');
        }

        if (location === 'installed_on_APA') {
          if (mesh.reception.detail) {
            const apa = await Components.retrieve(mesh.reception.detail);

            cleanedMeshGroup.installedOnAPA.push(apa.data.componentName);
          } else {
            cleanedMeshGroup.installedOnAPA.push('[No APA UUID found!]');
          }
        } else {
          cleanedMeshGroup.installedOnAPA.push('[Not installed on APA]');
        }
      }

      if (cleanedMeshGroup.componentUuids.length > 0) cleanedResults.push(cleanedMeshGroup);
    }
  } else if (['CableHarness', 'CEAdapterBoard', 'CRBoard', 'GBiasBoard', 'SHVBoard'].includes(typeFormId)) {
    for (const result of results) {
      const component = await Components.retrieve(MUUID.from(result.componentUuid).toString());

      let qaChecksPassed = false;

      let match_condition = {
        typeFormId: 'PopulatedBoardQC',
        componentUuid: MUUID.from(result.componentUuid).toString(),
      };

      const qaChecksActions = await Actions.list(match_condition);

      if (qaChecksActions.length > 0) {
        const qaChecksAction = await Actions.retrieve(qaChecksActions[0].actionId);

        if (['CableHarness', 'CEAdapterBoard', 'SHVBoard'].includes(typeFormId)) {
          if (qaChecksAction.data.qaTestResult === 'passed') {
            qaChecksPassed = true;
          }
        } else if (['CRBoard', 'GBiasBoard'].includes(typeFormId)) {
          if ((qaChecksAction.data.preColdCycleTest === 'passed') && (qaChecksAction.data.postColdCycleTest === 'passed')) {
            qaChecksPassed = true;
          }
        }
      }

      if ((qaChecksStatus === 'any') || ((qaChecksStatus === 'passed') && (qaChecksPassed == true)) || (qaChecksStatus === 'failed') && (qaChecksPassed == false)) {
        if (['CEAdapterBoard', 'CRBoard', 'GBiasBoard', 'SHVBoard'].includes(typeFormId)) {
          cleanedResults.push({
            'componentUuid': result.componentUuid,
            'typeRecordNumber': component.data.typeRecordNumber,
            'receptionDate': (component.reception != null) ? component.reception.date : 'unknown',
            'qaChecksPassed': (qaChecksPassed == true) ? 'Yes' : 'No',
          });
        } else {
          cleanedResults.push({
            'componentUuid': result.componentUuid,
            'typeRecordNumber': `${component.data.typeRecordNumber}${(component.data.cableHarnessSide).toUpperCase()}`,
            'receptionDate': (component.reception != null) ? component.reception.date : 'unknown',
            'qaChecksPassed': (qaChecksPassed == true) ? 'Yes' : 'No',
          });
        }
      }
    }
  } else {
    for (const result of results) {
      const component = await Components.retrieve(MUUID.from(result.componentUuid).toString());

      cleanedResults.push({
        'componentUuid': result.componentUuid,
        'typeRecordNumber': component.data.typeRecordNumber,
        'receptionDate': (component.reception != null) ? component.reception.date : 'unknown',
      });
    }
  }

  // Return the list of components, possibly grouped by part numbers
  return cleanedResults;
}


/// Retrieve a list of components that match the specified type and part number across all locations
async function componentsByTypeAndPartNumber(typeFormId, partNumber, acceptanceStatus, toothStripStatus) {
  let aggregation_stages = [];

  // Match against the type form ID and specified part number to get records of all components of the specified type and part number
  // For geometry boards, also match against the reception location if the specified 'acceptanceStatus' is 'rejected'
  if (typeFormId === 'GeometryBoard') {
    let matchConditions = {
      'formId': typeFormId,
      'data.partNumber': partNumber,
    }

    if (acceptanceStatus === 'rejected') {
      matchConditions['reception.location'] = acceptanceStatus;
    } else if (acceptanceStatus === 'accepted') {
      matchConditions['reception.location'] = { $not: { $eq: 'rejected' } };
    }

    aggregation_stages.push({ $match: matchConditions });
  } else if (typeFormId === 'GroundingMeshPanel') {
    aggregation_stages.push({
      $match: {
        'formId': typeFormId,
        'data.meshPanelPartNumber': partNumber,
      }
    });
  }

  // Select the latest version of each record, and pass through only the fields required for later use
  aggregation_stages.push({ $sort: { 'validity.version': -1 } });
  aggregation_stages.push({
    $group: {
      _id: { componentUuid: '$componentUuid' },
      componentUuid: { '$first': '$componentUuid' },
      receptionLocation: { '$first': '$reception.location' },
      typeRecordNumber: { '$first': '$data.typeRecordNumber' },
    },
  });

  aggregation_stages.push({ $sort: { 'typeRecordNumber': 1 } });

  // Group the records according to the location, and pass through the fields required for later use
  aggregation_stages.push({
    $group: {
      _id: { receptionLocation: '$receptionLocation' },
      componentUuid: { $push: '$componentUuid' },
    }
  });

  // Sort the record groups to be in alphabetical order of the location
  aggregation_stages.push({ $sort: { '_id.receptionLocation': 1 } });

  // Query the 'components' records collection using the aggregation stages defined above
  let results = await db.collection('components')
    .aggregate(aggregation_stages)
    .toArray();

  // Reorganise the query results to make it easier to display them on the interface page ... the format of the reorganised results depends on the specified component type
  // Additionally for the 'Geometry Board' component type, filter the results based on the optional 'tooth strip attachment status' search parameter
  // (remembering that 'filtering' based on the other optional 'board acceptance status' parameter was already applied at the matching stage above)
  let cleanedResults = [];

  if (typeFormId === 'GeometryBoard') {
    for (const boardGroup of results) {
      let cleanedBoardGroup = {};

      cleanedBoardGroup.receptionLocation = boardGroup._id.receptionLocation;

      cleanedBoardGroup.componentUuids = [];
      cleanedBoardGroup.ukids = [];
      cleanedBoardGroup.receptionDates = [];
      cleanedBoardGroup.installedOnAPA = [];

      for (const boardUuid of boardGroup.componentUuid) {
        let toothStripAttached = false;
        let includeBoard_basedOnToothStripStatus = false;

        match_condition = {
          typeFormId: 'BoardToothStripAttachment',
          componentUuid: MUUID.from(boardUuid).toString(),
        }

        const toothStripAttachmentActions = await Actions.list(match_condition);

        if (toothStripAttachmentActions.length > 0) toothStripAttached = true;

        if ((toothStripStatus === 'any') || ((toothStripStatus === 'attached') && (toothStripAttached == true)) || (toothStripStatus == 'notAttached') && (toothStripAttached == false)) {
          const board = await Components.retrieve(MUUID.from(boardUuid).toString());

          cleanedBoardGroup.componentUuids.push(MUUID.from(boardUuid).toString());
          cleanedBoardGroup.ukids.push(board.data.typeRecordNumber);

          if (board.reception) {
            cleanedBoardGroup.receptionDates.push(board.reception.date);
          } else {
            cleanedBoardGroup.receptionDates.push('[No Date Found!]');
          }

          if (boardGroup._id.receptionLocation === 'installed_on_APA') {
            if (board.reception.detail) {
              const apa = await Components.retrieve(board.reception.detail);

              cleanedBoardGroup.installedOnAPA.push(apa.data.componentName);
            } else {
              cleanedBoardGroup.installedOnAPA.push('[No APA UUID found!]');
            }
          } else if (boardGroup._id.receptionLocation === 'rejected') {
            if (board.reception.detail) {
              cleanedBoardGroup.installedOnAPA.push(board.reception.detail.substring(1, board.reception.detail.length - 1));
            } else {
              cleanedBoardGroup.installedOnAPA.push('[No rejection info!]');
            }
          } else {
            cleanedBoardGroup.installedOnAPA.push('[Not installed on APA]');
          }
        }
      }

      if (cleanedBoardGroup.componentUuids.length > 0) cleanedResults.push(cleanedBoardGroup);
    }
  } else if (typeFormId === 'GroundingMeshPanel') {
    for (const meshGroup of results) {
      let cleanedMeshGroup = {};

      cleanedMeshGroup.receptionLocation = meshGroup._id.receptionLocation;

      cleanedMeshGroup.componentUuids = [];
      cleanedMeshGroup.dunePids = [];
      cleanedMeshGroup.receptionDates = [];
      cleanedMeshGroup.installedOnAPA = [];

      for (const meshUuid of meshGroup.componentUuid) {
        const mesh = await Components.retrieve(MUUID.from(meshUuid).toString());

        cleanedMeshGroup.componentUuids.push(MUUID.from(meshUuid).toString());
        cleanedMeshGroup.dunePids.push(mesh.data.dunePid);

        if (mesh.reception) {
          cleanedMeshGroup.receptionDates.push(mesh.reception.date);
        } else {
          cleanedMeshGroup.receptionDates.push('[No Date Found!]');
        }

        if (meshGroup._id.receptionLocation === 'installed_on_APA') {
          if (mesh.reception.detail) {
            const apa = await Components.retrieve(mesh.reception.detail);

            cleanedMeshGroup.installedOnAPA.push(apa.data.componentName);
          } else {
            cleanedMeshGroup.installedOnAPA.push('[No APA UUID found!]');
          }
        } else {
          cleanedMeshGroup.installedOnAPA.push('[Not installed on APA]');
        }
      }

      if (cleanedMeshGroup.componentUuids.length > 0) cleanedResults.push(cleanedMeshGroup);
    }
  }

  // Return the list of components, possibly grouped by reception locations
  return cleanedResults;
}


module.exports = {
  geoBoardShipmentsByReceptionDetails,
  geoBoardShipmentsByBoardUUID,
  apasByProductionLocationAndNumber,
  apasByProductionLocationAndAssemblyStep,
  componentsByDUNEPID,
  componentsByTypeAndNumber,
  componentsByTypeAndLocation,
  componentsByTypeAndPartNumber,
}
