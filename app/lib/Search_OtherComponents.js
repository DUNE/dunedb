const MUUID = require('uuid-mongodb');

const Components = require('./Components');
const { db } = require('./db');


/// Retrieve a list of geometry board shipments that match the specified reception details
async function boardShipmentsByReceptionDetails(status, origin, destination, earliest, latest, comment) {
  // Set up 'matching' strings that can be used by MongoDB to match against specific record field values
  // For each potential location (origin or destination), if it has been specified, just use it as the matching string ... otherwise use a fully wildcard regular expression
  const originString = (origin) ? origin : /(.*?)/;
  const destinationString = (destination) ? destination : /(.*?)/;

  let comp_aggregation_stages = [];

  // Match against the type form ID and both locations to get records of all 'Board Shipment' components that were supposed to travel between the specified locations
  comp_aggregation_stages.push({
    $match: {
      'formId': 'BoardShipment',
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

  // At this point, we have a list of 'Board Shipment' component records that:
  //   - originated at the specified origin location (if one was specified), or at any location (if not)
  //   - were supposed to end up at the specified destination location (if one was specified), or at any location (if not)
  // But what we actually want is a combination of some information from both the shipment component record and the corresponding reception action record (if the shipment has been received)
  let shipments = [];

  // For each shipment record ...
  for (const shipmentRecord of component_results) {
    let action_aggregation_stages = [];

    // Match against the type form ID and component UUID to get records of all 'Board Reception' actions performed on the specified board shipment component
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


/// Retrieve a list of grounding mesh panels that are at a specified location across all part numbers
async function meshesByLocation(location) {
  let aggregation_stages = [];

  // Match against the type form ID and specified location to get records of all 'Grounding Mesh Panel' components currently at this location
  aggregation_stages.push({
    $match: {
      'formId': 'GroundingMeshPanel',
      'reception.location': location,
    }
  });

  // Select the latest version of each record, and pass through only the fields required for later use
  aggregation_stages.push({ $sort: { 'validity.version': -1 } });
  aggregation_stages.push({
    $group: {
      _id: { componentUuid: '$componentUuid' },
      partNumber: { '$first': '$data.meshPanelPartNumber' },
      componentUuid: { '$first': '$componentUuid' },
    },
  });

  // Group the records according to the mesh part number and corresponding string, and pass through the fields required for later use
  aggregation_stages.push({
    $group: {
      _id: { partNumber: '$partNumber' },
      componentUuid: { $push: '$componentUuid' },
    }
  });

  // Sort the record groups to be in numerical order of the part number
  aggregation_stages.push({ $sort: { '_id.partNumber': 1 } });

  // Query the 'components' records collection using the aggregation stages defined above
  let results = await db.collection('components')
    .aggregate(aggregation_stages)
    .toArray();

  // Reorganise the query results to make it easier to display them on the interface page
  let cleanedResults = [];

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
      cleanedMeshGroup.dunePids.push(mesh.data.name);

      if (mesh.reception) {
        cleanedMeshGroup.receptionDates.push(mesh.reception.date);
      } else {
        cleanedMeshGroup.receptionDates.push('[No Date Found!]');
      }

      if (location === 'installed_on_APA') {
        if (mesh.reception.detail) {
          const apa = await Components.retrieve(mesh.reception.detail);

          const name_splits = apa.data.name.split('-');
          cleanedMeshGroup.installedOnAPA.push(`${name_splits[1]}-${name_splits[2]}`.slice(0, -3));
        } else {
          cleanedMeshGroup.installedOnAPA.push('[No APA UUID found!]');
        }
      } else {
        cleanedMeshGroup.installedOnAPA.push('[Not installed on APA]');
      }
    }

    if (cleanedMeshGroup.componentUuids.length > 0) cleanedResults.push(cleanedMeshGroup);
  }

  // Return the list of meshes grouped by part numbers
  return cleanedResults;
}


/// Retrieve a list of grounding mesh panels of a specified part number across all mesh locations
async function meshesByPartNumber(partNumber) {
  let aggregation_stages = [];

  // Match against the type form ID and specified part number to get records of all 'Grounding Mesh Panel' components of this part number
  aggregation_stages.push({
    $match: {
      'formId': 'GroundingMeshPanel',
      'data.meshPanelPartNumber': partNumber,
    }
  });

  // Select the latest version of each record, and pass through only the fields required for later use
  aggregation_stages.push({ $sort: { 'validity.version': -1 } });
  aggregation_stages.push({
    $group: {
      _id: { componentUuid: '$componentUuid' },
      componentUuid: { '$first': '$componentUuid' },
      receptionLocation: { '$first': '$reception.location' },
    },
  });

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

  // Reorganise the query results to make it easier to display them on the interface page
  let cleanedResults = [];

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
      cleanedMeshGroup.dunePids.push(mesh.data.name);

      if (mesh.reception) {
        cleanedMeshGroup.receptionDates.push(mesh.reception.date);
      } else {
        cleanedMeshGroup.receptionDates.push('[No Date Found!]');
      }

      if (meshGroup._id.receptionLocation === 'installed_on_APA') {
        if (mesh.reception.detail) {
          const apa = await Components.retrieve(mesh.reception.detail);

          const name_splits = apa.data.name.split('-');
          cleanedMeshGroup.installedOnAPA.push(`${name_splits[1]}-${name_splits[2]}`.slice(0, -3));
        } else {
          cleanedMeshGroup.installedOnAPA.push('[No APA UUID found!]');
        }
      } else {
        cleanedMeshGroup.installedOnAPA.push('[Not installed on APA]');
      }
    }

    if (cleanedMeshGroup.componentUuids.length > 0) cleanedResults.push(cleanedMeshGroup);
  }

  // Return the list of meshes grouped by reception location
  return cleanedResults;
}


/// Retrieve a list of populated board kit components that are at a specified location across all component types
async function boardKitComponentsByLocation(location) {
  let aggregation_stages = [];

  // Match against the type form ID and specified location to get records of all populated board kit components currently at this location
  aggregation_stages.push({
    $match: {
      'formId': { $in: ['CRBoard', 'GBiasBoard', 'SHVBoard', 'CableHarness'] },
      'reception.location': location,
    }
  });

  // Select the latest version of each record, and pass through only the fields required for later use
  aggregation_stages.push({ $sort: { 'validity.version': -1 } });
  aggregation_stages.push({
    $group: {
      _id: { componentUuid: '$componentUuid' },
      componentUuid: { '$first': '$componentUuid' },
      type: { '$first': '$formId' },
    },
  });

  // Group the records according to the component type form IDs, and pass through the fields required for later use
  aggregation_stages.push({
    $group: {
      _id: { type: '$type' },
      componentUuid: { $push: '$componentUuid' },
    }
  });

  // Sort the record groups to be in alphabetical order of the component type
  aggregation_stages.push({ $sort: { '_id.type': 1 } });

  // Query the 'components' records collection using the aggregation stages defined above
  let results = await db.collection('components')
    .aggregate(aggregation_stages)
    .toArray();

  // Reorganise the query results to make it easier to display them on the interface page
  let cleanedResults = [];

  for (const componentGroup of results) {
    let cleanedComponentGroup = {};

    cleanedComponentGroup.type = componentGroup._id.type;

    cleanedComponentGroup.componentUuids = [];
    cleanedComponentGroup.dunePids = [];
    cleanedComponentGroup.receptionDates = [];
    cleanedComponentGroup.installedOnAPA = [];

    for (const componentUuid of componentGroup.componentUuid) {
      const component = await Components.retrieve(MUUID.from(componentUuid).toString());

      cleanedComponentGroup.componentUuids.push(MUUID.from(componentUuid).toString());
      cleanedComponentGroup.dunePids.push(component.data.name);

      if (component.reception) {
        cleanedComponentGroup.receptionDates.push(component.reception.date);
      } else {
        cleanedComponentGroup.receptionDates.push('[No Date Found!]');
      }

      if (location === 'installed_on_APA') {
        if (component.reception.detail) {
          const apa = await Components.retrieve(component.reception.detail);

          const name_splits = apa.data.name.split('-');
          cleanedComponentGroup.installedOnAPA.push(`${name_splits[1]}-${name_splits[2]}`.slice(0, -3));
        } else {
          cleanedComponentGroup.installedOnAPA.push('[No APA UUID found!]');
        }
      } else {
        cleanedComponentGroup.installedOnAPA.push('[Not installed on APA]');
      }
    }

    if (cleanedComponentGroup.componentUuids.length > 0) cleanedResults.push(cleanedComponentGroup);
  }

  // Return the list of components grouped by component type form ID
  return cleanedResults;
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
      'data.apaNumberAtLocation': parseInt(number, 10),
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
async function apasByLastCompletedAssemblyStep(assemblyStep) {
  let action_aggregation_stages = [];

  // Match against the type form ID to get records of all 'Asssmbled APA QA Check' actions that have been performed and completed at the specified assembly step
  action_aggregation_stages.push({
    $match: {
      'typeFormId': 'AssembledAPAQACheck',
      'data.workflowSectionBeingQAed': assemblyStep,
      'data.actionComplete': true,
    }
  });

  // Select the latest version of each record, and pass through only the fields required for later use
  action_aggregation_stages.push({ $sort: { 'validity.version': -1 } });
  action_aggregation_stages.push({
    $group: {
      _id: { actionId: '$actionId' },
      actionId: { '$first': '$actionId' },
      componentUuid: { '$first': '$componentUuid' },
    },
  });

  // Query the 'actions' records collection using the aggregation stages defined above
  let apasCompletedToStep = await db.collection('actions')
    .aggregate(action_aggregation_stages)
    .toArray();

  // At this point, we have a list of completed 'Assembled APA QA Check' action records
  // But we actually want a list of the Assembled APA components that these actions have been performed on
  // Loop over the action records, retrieve the associated component record, and add the desired information to each record
  let uuids_apasCompletedToStep = []

  for (let action of apasCompletedToStep) {
    uuids_apasCompletedToStep.push(action.componentUuid);

    const component = await Components.retrieve(MUUID.from(action.componentUuid).toString());
    const name_splits = component.data.name.split('-');

    action.componentName = `${name_splits[1]}-${name_splits[2]}`.slice(0, -3);
    action.workflowId = component.workflowId;
  }

  // Re-sort the records by the component name, in reverse alphanumerical order
  // This must be done here using JavaScript, rather than as part of the MongoDB aggregation, because component names are only added to the records after the aggregation is complete
  var byField = function (field) {
    return function (a, b) {
      return ((a[field] > b[field]) ? -1 : ((a[field] < b[field]) ? 1 : 0));
    }
  };

  apasCompletedToStep.sort(byField('componentName'));

  let comp_aggregation_stages = [];

  // Now we also want a list of the Assembled APA components that these actions have NOT been performed on
  // Match against the type form ID and component UUID to get records of all 'Assembled APA' components that the previously found 'Assembled APA QA Check' actions were NOT performed on
  comp_aggregation_stages.push({
    $match: {
      'formId': 'AssembledAPA',
      'componentUuid': { $nin: uuids_apasCompletedToStep }
    }
  });

  // Select the latest version of each record, and pass through only the fields required for later use
  comp_aggregation_stages.push({ $sort: { 'validity.version': -1 } });
  comp_aggregation_stages.push({
    $group: {
      _id: { componentUuid: '$componentUuid' },
      componentUuid: { '$first': '$componentUuid' },
      workflowId: { '$first': '$workflowId' },
    },
  });

  // Query the 'components' records collection using the aggregation stages defined above
  let apasNotCompletedToStep = await db.collection('components')
    .aggregate(comp_aggregation_stages)
    .toArray();

  // Add the corresponding shortened Assembled APA component name to each matching record
  for (let record of apasNotCompletedToStep) {
    const component = await Components.retrieve(MUUID.from(record.componentUuid).toString());
    const name_splits = component.data.name.split('-');
    record.componentName = `${name_splits[1]}-${name_splits[2]}`.slice(0, -3);
  }

  // Re-sort the records by the component name ... in reverse alphanumerical order
  apasNotCompletedToStep.sort(byField('componentName'));

  // Return a nested list, consisting of:
  // - [0] the list of all assembled APAs that have had matching 'Assembled APA QA Check' actions performed on them and completed
  // - [1] the list of all assembled APAs that have NOT had such actions performed on them and/or completed
  return [apasCompletedToStep, apasNotCompletedToStep];
}


/// Retrieve a list of components that match the specified type and type record number
async function componentsByTypeAndNumber(type, typeRecordNumber) {
  let aggregation_stages = [];

  // Match against the type form ID and type record number to get records of all components that have the same type and number as the specified ones
  aggregation_stages.push({
    $match: {
      'formId': type,
      'data.typeRecordNumber': parseInt(typeRecordNumber, 10),
    }
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


module.exports = {
  boardShipmentsByReceptionDetails,
  meshesByLocation,
  meshesByPartNumber,
  boardKitComponentsByLocation,
  apasByProductionLocationAndNumber,
  apasByLastCompletedAssemblyStep,
  componentsByTypeAndNumber,
}
