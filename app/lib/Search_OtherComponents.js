const MUUID = require('uuid-mongodb');

const { db } = require('./db');


/// Retrieve a list of geometry board shipments that match the specified reception details
async function boardShipmentsByReceptionDetails(status, origin, destination, earliest, latest, comment) {
  // Set up 'matching' strings that can be used by MongoDB to match against specific record field values
  // For each potential location (origin or destination), if it has been specified, just use it as the matching string ... otherwise use a fully wildcard regular expression
  const originString = (origin) ? origin : /(.*?)/;
  const destinationString = (destination) ? destination : /(.*?)/;

  let comp_aggregation_stages = [];

  // Retrieve all shipment component records that match the origin and destination location matching strings
  comp_aggregation_stages.push({
    $match: {
      'formId': 'BoardShipment',
      'data.originOfShipment': originString,
      'data.destinationOfShipment': destinationString,
    }
  });

  // Select only the latest version of each record
  // First sort the matching records by validity ... highest version first
  // Then group the records by the action ID (i.e. each group contains all versions of the same action), and select only the first (highest version number) entry in each group
  // Finally, set which fields in the first record are to be returned for use in subsequent aggregation stages
  comp_aggregation_stages.push({ $sort: { 'validity.version': -1 } });
  comp_aggregation_stages.push({
    $group: {
      _id: { componentUuid: '$componentUuid' },
      componentUuid: { '$first': '$componentUuid' },
      data: { '$first': '$data' },
    },
  });

  // Query the 'components' records collection using the aggregation stages defined above
  let component_results = await db.collection('components')
    .aggregate(comp_aggregation_stages)
    .toArray();

  // At this stage we have a list of 'Board Shipment' component records that:
  //   - originated at the specified origin location (if one was specified), or at any location (if not)
  //   - were supposed to end up at the specified destination location (if one was specified), or at any location (if not)
  // But what we actually want is a combination of some information from both the shipment component record and the corresponding reception action record (if the shipment has been received)
  let shipments = [];

  // For each shipment record ...
  for (const shipmentRecord of component_results) {
    // Set up a query to the 'actions' records collection to retrieve the record of the most recent 'Board Shipment Reception' action performed on this shipment (match by shipment UUID)
    let action_aggregation_stages = [];

    action_aggregation_stages.push({
      $match: {
        'typeFormId': 'BoardReception',
        'componentUuid': shipmentRecord.componentUuid,
      }
    });

    action_aggregation_stages.push({ $sort: { 'validity.version': -1 } });
    action_aggregation_stages.push({
      $group: {
        _id: { actionId: '$actionId' },
        actionId: { '$first': '$actionId' },
        componentUuid: { '$first': '$componentUuid' },
        data: { '$first': '$data' },
      },
    });

    let action_results = await db.collection('actions')
      .aggregate(action_aggregation_stages)
      .toArray();

    // Set up the single shipment object that will contain the component information and any additional action information
    let shipment = {
      uuid: shipmentRecord.componentUuid,
      numberOfBoards: shipmentRecord.data.boardUuiDs.length,
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


/// Retrieve a list of grounding mesh panels that have been received at a specified location across all part numbers
async function meshesByLocation(location) {
  let aggregation_stages = [];

  // Retrieve all 'Grounding Mesh Panel' records that have the same reception location as the specified one
  aggregation_stages.push({
    $match: {
      'formId': 'GroundingMeshPanel',
      'reception.location': location,
    }
  });

  // Select only the latest version of each record
  // First sort the matching records by validity ... highest version first
  // Then group the records by the component UUID (i.e. each group contains all versions of the same component), and select only the first (highest version number) entry in each group
  // Finally, set which fields in the first record are to be returned for use in subsequent aggregation stages
  aggregation_stages.push({ $sort: { 'validity.version': -1 } });
  aggregation_stages.push({
    $group: {
      _id: { componentUuid: '$componentUuid' },
      partNumber: { '$first': '$data.meshPanelPartNumber' },
      componentUuid: { '$first': '$componentUuid' },
      dunePid: { '$first': '$data.name' },
      receptionDate: { '$first': '$reception.date' },
    },
  });

  // We want to actually display the matched meshes grouped by the mesh part numbers
  // So group the records according to the mesh part number and corresponding string, and then add the fields to be returned for each mesh in each group
  aggregation_stages.push({
    $group: {
      _id: { partNumber: '$partNumber' },
      componentUuid: { $push: '$componentUuid' },
      dunePid: { $push: '$dunePid' },
      receptionDate: { $push: '$receptionDate' },
    }
  });

  // Query the 'components' records collection using the aggregation stages defined above
  let results = await db.collection('components')
    .aggregate(aggregation_stages)
    .toArray();

  // The query results are a bit of a mess at this point, so clean them up to make it easier to display them on the search results page
  let cleanedResults = [];

  for (const meshGroup of results) {
    let cleanedMeshGroup = {};

    cleanedMeshGroup.partNumber = meshGroup._id.partNumber;

    cleanedMeshGroup.componentUuids = [];

    for (const meshUuid of meshGroup.componentUuid) {
      cleanedMeshGroup.componentUuids.push(MUUID.from(meshUuid).toString());
    }

    cleanedMeshGroup.dunePids = meshGroup.dunePid;
    cleanedMeshGroup.receptionDates = meshGroup.receptionDate;

    cleanedResults.push(cleanedMeshGroup);
  }

  // Return the list of meshes grouped by part numbers
  return cleanedResults;
}


/// Retrieve a list of grounding mesh panels of a specified part number across all mesh reception locations
async function meshesByPartNumber(partNumber) {
  let aggregation_stages = [];

  // Retrieve all 'Grounding Mesh Panel' records that have the same part number as the specified one
  aggregation_stages.push({
    $match: {
      'formId': 'GroundingMeshPanel',
      'data.meshPanelPartNumber': partNumber,
    }
  });

  // Select only the latest version of each record
  // First sort the matching records by validity ... highest version first
  // Then group the records by the component UUID (i.e. each group contains all versions of the same component), and select only the first (highest version number) entry in each group
  // Finally, set which fields in the first record are to be returned for use in subsequent aggregation stages
  aggregation_stages.push({ $sort: { 'validity.version': -1 } });
  aggregation_stages.push({
    $group: {
      _id: { componentUuid: '$componentUuid' },
      componentUuid: { '$first': '$componentUuid' },
      dunePid: { '$first': '$data.name' },
      receptionDate: { '$first': '$reception.date' },
      receptionLocation: { '$first': '$reception.location' },
    },
  });

  // We want to actually display the matched meshes grouped by the reception location
  // So group the records according to the reception location, and then add the fields to be returned for each mesh in each group
  aggregation_stages.push({
    $group: {
      _id: { receptionLocation: '$receptionLocation' },
      componentUuid: { $push: '$componentUuid' },
      dunePid: { $push: '$dunePid' },
      receptionDate: { $push: '$receptionDate' },
    }
  });

  // Query the 'components' records collection using the aggregation stages defined above
  let results = await db.collection('components')
    .aggregate(aggregation_stages)
    .toArray();

  // The query results are a bit of a mess at this point, so clean them up to make it easier to display them on the search results page
  let cleanedResults = [];

  for (const meshGroup of results) {
    let cleanedMeshGroup = {};

    cleanedMeshGroup.receptionLocation = meshGroup._id.receptionLocation;

    cleanedMeshGroup.componentUuids = [];
    cleanedMeshGroup.dunePids = [];

    for (const [index, meshUuid] of meshGroup.componentUuid.entries()) {
      cleanedMeshGroup.componentUuids.push(MUUID.from(meshUuid).toString());
      cleanedMeshGroup.dunePids.push(meshGroup.dunePid[index]);
    }

    cleanedResults.push(cleanedMeshGroup);
  }

  // Return the list of meshes grouped by reception location
  return cleanedResults;
}


/// Retrieve a list of assembled APAs that match the specified location and production number
async function apasByLocation(location, productionNumber) {
  let aggregation_stages = [];

  // Retrieve all assembled APAs records that have the same location and production number as the specified values
  aggregation_stages.push({
    $match: {
      'formId': 'AssembledAPA',
      'data.apaAssemblyLocation': location,
      'data.apaNumberAtLocation': parseInt(productionNumber, 10),
    }
  });

  // Select only the latest version of each record
  // First sort the matching records by validity ... highest version first
  // Then group the records by the component UUID (i.e. each group contains all versions of the same component), and select only the first (highest version number) entry in each group
  // Finally, set which fields in the first record are to be returned for use in subsequent aggregation stages
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

  // Return the list of assembled APAs
  return results;
}


/// Retrieve a list of components that match the specified type and type record number
async function componentsByTypeAndNumber(type, typeRecordNumber) {
  let aggregation_stages = [];

  // Retrieve all component records that have the same component type and type record number as the specified values
  aggregation_stages.push({
    $match: {
      'formId': type,
      'data.typeRecordNumber': parseInt(typeRecordNumber, 10),
    }
  });

  // Select only the latest version of each record
  // First sort the matching records by validity ... highest version first
  // Then group the records by the component UUID (i.e. each group contains all versions of the same component), and select only the first (highest version number) entry in each group
  // Finally, set which fields in the first record are to be returned for use in subsequent aggregation stages
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
  apasByLocation,
  componentsByTypeAndNumber,
}
