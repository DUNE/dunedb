const MUUID = require('uuid-mongodb');

const Components = require('./Components');
const { db } = require('./db');


/// Retrieve a list of geometry boards that have been received at a specified location across all part numbers
async function boardsByLocation(location) {
  let aggregation_stages = [];

  // Retrieve all 'Geometry Board' records that have the same reception location as the specified one
  aggregation_stages.push({
    $match: {
      'formId': 'GeometryBoard',
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
      partNumber: { '$first': '$data.partNumber' },
      partString: { '$first': '$data.partString' },
      componentUuid: { '$first': '$componentUuid' },
      ukid: { '$first': '$data.typeRecordNumber' },
      receptionDate: { '$first': '$reception.date' },
    },
  });

  // We want to actually display the matched boards grouped by the board part numbers
  // So group the records according to the board part number and corresponding string, and then add the fields to be returned for each board in each group
  aggregation_stages.push({
    $group: {
      _id: {
        partNumber: '$partNumber',
        partString: '$partString',
      },
      componentUuid: { $push: '$componentUuid' },
      ukid: { $push: '$ukid' },
      receptionDate: { $push: '$receptionDate' },
    }
  });

  // Query the 'components' records collection using the aggregation stages defined above
  let results = await db.collection('components')
    .aggregate(aggregation_stages)
    .toArray();

  // The query results are a bit of a mess at this point, so clean them up to make it easier to display them on the search results page
  let cleanedResults = [];

  for (const boardGroup of results) {
    let cleanedBoardGroup = {};

    cleanedBoardGroup.partNumber = boardGroup._id.partNumber;
    cleanedBoardGroup.partString = boardGroup._id.partString;

    cleanedBoardGroup.componentUuids = [];

    for (const boardUuid of boardGroup.componentUuid) {
      cleanedBoardGroup.componentUuids.push(MUUID.from(boardUuid).toString());
    }

    cleanedBoardGroup.ukids = boardGroup.ukid;
    cleanedBoardGroup.receptionDates = boardGroup.receptionDate;

    cleanedResults.push(cleanedBoardGroup);
  }

  // Return the list of boards grouped by part numbers
  return cleanedResults;
}


/// Retrieve a list of geometry boards of a specified part number across all board reception locations
async function boardsByPartNumber(partNumber) {
  let aggregation_stages = [];

  // Retrieve all 'Geometry Board' records that have the same part number as the specified one
  aggregation_stages.push({
    $match: {
      'formId': 'GeometryBoard',
      'data.partNumber': partNumber,
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
      ukid: { '$first': '$data.typeRecordNumber' },
      receptionDate: { '$first': '$reception.date' },
      receptionLocation: { '$first': '$reception.location' },
    },
  });

  // We want to actually display the matched boards grouped by the reception location
  // So group the records according to the reception location, and then add the fields to be returned for each board in each group
  aggregation_stages.push({
    $group: {
      _id: { receptionLocation: '$receptionLocation' },
      componentUuid: { $push: '$componentUuid' },
      ukid: { $push: '$ukid' },
      receptionDate: { $push: '$receptionDate' },
    }
  });

  // Query the 'components' records collection using the aggregation stages defined above
  let results = await db.collection('components')
    .aggregate(aggregation_stages)
    .toArray();

  // The query results are a bit of a mess at this point, so clean them up to make it easier to display them on the search results page
  let cleanedResults = [];

  for (const boardGroup of results) {
    let cleanedBoardGroup = {};

    cleanedBoardGroup.receptionLocation = boardGroup._id.receptionLocation;

    cleanedBoardGroup.componentUuids = [];

    for (const boardUuid of boardGroup.componentUuid) {
      cleanedBoardGroup.componentUuids.push(MUUID.from(boardUuid).toString());
    }

    cleanedBoardGroup.ukids = boardGroup.ukid;
    cleanedBoardGroup.receptionDates = boardGroup.receptionDate;

    cleanedResults.push(cleanedBoardGroup);
  }

  // Return the list of boards grouped by reception location
  return cleanedResults;
}


/// Retrieve a list of geometry boards that have a specified visual inspection disposition across all order numbers
async function boardsByVisualInspection(disposition) {
  let action_aggregation_stages = [];

  // Retrieve all 'Visual Inspection' action records that have the same disposition result as the specified one
  action_aggregation_stages.push({
    $match: {
      'typeFormId': 'BoardVisualInspection',
      'data.nonConformingDisposition': disposition,
    }
  });

  // Select only the latest version of each record
  // First sort the matching records by validity ... highest version first
  // Then group the records by the action ID (i.e. each group contains all versions of the same action), and select only the first (highest version number) entry in each group
  // Finally, set which fields in the first record are to be returned for use in subsequent aggregation stages
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

  // At this stage we have a list of 'Visual Inspection' action records with the specified disposition
  // But what we actually want is the component records of the geometry boards on which these actions have been performed

  // Extract and save the component UUIDs from the action records into a list, and extract the action ID and inspection data into dictionaries keyed by UUID
  // These dictionaries are important for tying together the component records and the corresponding action data ...
  // ... regardless of the order in which the component records are retrieved (it may be different from the list order)
  let componentUUIDs = [], uuidsAndIds = {}, uuidsAndData = {};

  for (let index = 0; index < action_results.length; ++index) {
    componentUUIDs.push(action_results[index].componentUuid);

    uuidsAndIds[action_results[index].componentUuid] = action_results[index].actionId;
    uuidsAndData[action_results[index].componentUuid] = action_results[index].data;
  }

  let comp_aggregation_stages = [];

  // Retrieve all 'Geometry Board' records with UUIDs matching those from the action records
  comp_aggregation_stages.push({
    $match: {
      'formId': 'GeometryBoard',
      'componentUuid': { $in: componentUUIDs }
    }
  });

  // Select only the latest version of each record
  // First sort the matching records by validity ... highest version first
  // Then group the records by the component UUID (i.e. each group contains all versions of the same component), and select only the first (highest version number) entry in each group
  // Finally, set which fields in the first record are to be returned for use in subsequent aggregation stages
  comp_aggregation_stages.push({ $sort: { 'validity.version': -1 } });
  comp_aggregation_stages.push({
    $group: {
      _id: { componentUuid: '$componentUuid' },
      partNumber: { '$first': '$data.partNumber' },
      partString: { '$first': '$data.partString' },
      componentUuid: { '$first': '$componentUuid' },
      ukid: { '$first': '$data.typeRecordNumber' },
      batchUuid: { '$first': '$data.fromBatch' },
    },
  });

  // We want to actually display the matched boards grouped by the board part numbers
  // So group the records according to the board part number and correponding string, and then add the fields to be returned for each board in each group
  comp_aggregation_stages.push({
    $group: {
      _id: {
        partNumber: '$partNumber',
        partString: '$partString',
      },
      componentUuid: { $push: '$componentUuid' },
      ukid: { $push: '$ukid' },
      batchUuid: { $push: '$batchUuid' },
    }
  });

  // Query the 'components' records collection using the aggregation stages defined above
  let component_results = await db.collection('components')
    .aggregate(comp_aggregation_stages)
    .toArray();

  // The query results are a bit of a mess at this point, so clean them up to make it easier to display them on the search results page
  let cleanedResults = [];

  for (const boardGroup of component_results) {
    let cleanedBoardGroup = {};

    cleanedBoardGroup.partNumber = boardGroup._id.partNumber;
    cleanedBoardGroup.partString = boardGroup._id.partString;

    cleanedBoardGroup.componentUuids = [];
    cleanedBoardGroup.actionIds = [];
    cleanedBoardGroup.inspectionData = [];

    for (const boardUuid of boardGroup.componentUuid) {
      cleanedBoardGroup.componentUuids.push(MUUID.from(boardUuid).toString());
      cleanedBoardGroup.actionIds.push(uuidsAndIds[boardUuid]);
      cleanedBoardGroup.inspectionData.push(uuidsAndData[boardUuid]);
    }

    cleanedBoardGroup.ukids = boardGroup.ukid;
    cleanedBoardGroup.batchUuids = boardGroup.batchUuid;

    cleanedBoardGroup.orderNumbers = [];

    for (const batchUuid of boardGroup.batchUuid) {
      const batch = await Components.retrieve(batchUuid);

      cleanedBoardGroup.orderNumbers.push(batch.data.orderNumber);
    }

    cleanedResults.push(cleanedBoardGroup);
  }

  // Return the list of boards grouped by part numbers
  return cleanedResults;
}


/// Retrieve a list of geometry boards of a specified order number across all visual inspection dispositions
async function boardsByOrderNumber(orderNumber) {
  let comp_aggregation_stages = [];

  // Retrieve all 'Geometry Board Batch' records that have the same order number as the specified one
  comp_aggregation_stages.push({
    $match: {
      'formId': 'GeometryBoardBatch',
      'data.orderNumber': orderNumber,
    }
  });

  // Each batch has a unique order number, but there may be multiple versions of this batch, so select only the latest version
  // First sort the matching records by validity ... highest version first
  // Then group the records by the component UUID (i.e. each group contains all versions of the same component), and select only the first (highest version number) entry in each group
  // Finally, set which fields in the first record are to be returned for use in subsequent aggregation stages
  comp_aggregation_stages.push({ $sort: { 'validity.version': -1 } });
  comp_aggregation_stages.push({
    $group: {
      _id: { componentUuid: '$componentUuid' },
      boardUuids: { '$first': '$data.subComponent_fullUuids' },
    },
  });

  // Query the 'components' records collection using the aggregation stages defined above
  // For geometry board batches, this should return either no records, or just one
  let batch_results = await db.collection('components')
    .aggregate(comp_aggregation_stages)
    .toArray();

  if (batch_results.length > 0) {
    // At this stage we have a single geometry board batch record containing a list of the individual board UUIDs
    // But what we actually want is the visual inspection action record for each individual board
    let boardUUIDs = [];

    for (const boardUUID of batch_results[0].boardUuids) {
      boardUUIDs.push(MUUID.from(boardUUID));
    }

    let action_aggregation_stages = [];

    // Retrieve all 'Visual Inspection' action records with UUIDs matching those from the batch record
    action_aggregation_stages.push({
      $match: {
        'typeFormId': 'BoardVisualInspection',
        'componentUuid': { $in: boardUUIDs },
      }
    });

    // Select only the latest version of each record
    // First sort the matching records by validity ... highest version first
    // Then group the records by the action ID (i.e. each group contains all versions of the same action), and select only the first (highest version number) entry in each group
    // Finally, set which fields in the first record are to be returned for use in subsequent aggregation stages
    action_aggregation_stages.push({ $sort: { 'validity.version': -1 } });
    action_aggregation_stages.push({
      $group: {
        _id: { actionId: '$actionId' },
        actionId: { '$first': '$actionId' },
        componentUuid: { '$first': '$componentUuid' },
        disposition: { '$first': '$data.nonConformingDisposition' },
        data: { '$first': '$data' },
      },
    });

    // We want to actually display the matched boards grouped by the disposition
    // So group the records according to the disposition, and then add the fields to be returned for each board in each group
    action_aggregation_stages.push({
      $group: {
        _id: { disposition: '$disposition' },
        actionId: { $push: '$actionId' },
        componentUuid: { $push: '$componentUuid' },
        data: { $push: '$data' },
      }
    });

    // Query the 'actions' records collection using the aggregation stages defined above
    let action_results = await db.collection('actions')
      .aggregate(action_aggregation_stages)
      .toArray();

    // The query results are a bit of a mess at this point, so clean them up to make it easier to display them on the search results page
    let cleanedResults = [];

    for (const dispositionGroup of action_results) {
      let cleanedDispositionGroup = {};

      cleanedDispositionGroup.disposition = dispositionGroup._id.disposition;

      cleanedDispositionGroup.actionIds = dispositionGroup.actionId;

      cleanedDispositionGroup.componentUuids = [];
      cleanedDispositionGroup.ukids = [];

      for (const boardUuid of dispositionGroup.componentUuid) {
        const uuidString = MUUID.from(boardUuid).toString();

        cleanedDispositionGroup.componentUuids.push(uuidString);

        const board = await Components.retrieve(uuidString);
        cleanedDispositionGroup.ukids.push(board.data.typeRecordNumber);
      }

      cleanedDispositionGroup.inspectionData = dispositionGroup.data;

      cleanedResults.push(cleanedDispositionGroup);
    }

    // Return the list of boards grouped by disposition
    return cleanedResults;
  }

  // If no matching geometry board batches are found (i.e. the whole of the 'if' statement above is skipped), return an empty list
  return [];
}


/// Retrieve a list of geometry board shipments that match the specified reception details
async function boardShipmentsByReceptionDetails(origin, destination, earliest, latest) {
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

    // Set up the single shipment object that will contain the combination of component and action information
    let shipment = {
      uuid: shipmentRecord.componentUuid,
      numberOfBoards: shipmentRecord.data.boardUuiDs.length,
      origin: shipmentRecord.data.originOfShipment,
      destination: shipmentRecord.data.destinationOfShipment,
      receptionDate: '(none)',
      receptionActionId: '(none)',
      receptionComment: '',
      searchComment: 'No reception record found!',
    }

    // Now set up some logic to handling matching the shipment reception date against any specified earliest or latest date query (or a combination of both)
    // First set up the JavaScript 'Date' objects for use in the comparison, with values dependent on if the earliest and/or latest dates were specified or not
    const earliestDate = (earliest) ? new Date(earliest) : new Date('2000-01-01');
    const latestDate = (latest) ? new Date(latest) : new Date();

    // If there are no matching reception action records, this indicates that this shipment has not yet been recorded as received (i.e. it may still be in transit)
    //   - if a date range query has not been specified, save the shipment object for return as-is (since it's fine that it hasn't yet been received - we're evidently not requiring it to have been)
    //   - if a date range query has been specified, DO NOT save the shipment object (since it cannot possibly match the specified date range)
    if (action_results.length === 0) {
      if (!earliest && !latest) shipments.push(shipment);
    }

    // If there is exactly one matching reception action record, this indicates that this shipment has been recorded as received
    // Add the recorded reception date to the shipment object and save it for return if:
    //   - either a date range query has not been specified, 
    //   - or a date range query has been specified, and the record's reception date matches to it
    // The same logic can be used for if there is more than one matching reception action record ...
    // ... such a scenario would indicate that this shipment has been received more than once, which shouldn't happen, but technically speaking there is nothing preventing it
    // In such a situation, an additional comment should be put in the returned shipment object to notify the user
    // Also, check that the actual reception location matches the intended destination ... if not, add a comment to notify the user
    else {
      const receptionDate = new Date(((action_results[0].data.receptionDate).split('T'))[0]);

      if ((!earliest && !latest) || ((earliest || latest) && (receptionDate >= earliestDate) && (receptionDate <= latestDate))) {
        shipment.receptionDate = (receptionDate.toISOString().split('T'))[0];
        shipment.receptionActionId = action_results[0].actionId;
        shipment.receptionComment = action_results[0].data.comments;

        if (action_results.length === 1) {
          shipment.searchComment = '';
        }
        else {
          shipment.searchComment = 'Multiple reception records found!';
        }

        if (shipment.destination !== action_results[0].data.receptionLocation) shipment.searchComment = 'Reception destination mismatch!';

        shipments.push(shipment);
      }
    }
  }

  // Return the list of shipments
  return shipments;
}


/// Retrieve a list of workflows that involve a particular component, specified by its UUID
async function workflowsByUUID(componentUUID) {
  let aggregation_stages = [];

  // Retrieve all workflows (across all types) that have the same component UUID as the specified one
  // For all workflows, the component UUID will always be set in the 'result' field of the first step in the path
  aggregation_stages.push({
    $match: { 'path.0.result': componentUUID }
  });

  // Select only the latest version of each record
  // First sort the matching records by validity ... highest version first
  // Then group the records by the  workflow ID (i.e. each group contains all versions of the same workflow), and select only the first (highest version number) entry in each group
  // Finally, set which fields in the first record are to be returned for use in subsequent aggregation stages
  aggregation_stages.push({ $sort: { 'validity.version': -1 } });
  aggregation_stages.push({
    $group: {
      _id: { workflowId: '$workflowId' },
      workflowId: { '$first': '$workflowId' },
      typeFormName: { '$first': '$typeFormName' },
      status: { '$first': '$status' },
    },
  });

  // Query the 'workflows' records collection using the aggregation stages defined above
  let results = await db.collection('workflows')
    .aggregate(aggregation_stages)
    .toArray();

  // Return the list of workflows
  return results;
}


/// Retrieve a list of assembled APAs that match the specified record details
async function apasByRecordDetails(location, configuration, locationNumber) {
  let aggregation_stages = [];

  // Retrieve all assembled APAs records that have the same location, configuration and location number as the specified values
  aggregation_stages.push({
    $match: {
      'formId': 'AssembledAPA',
      'data.apaAssemblyLocation': location,
      'data.apaConfiguration': configuration,
      'data.apaNumberAtLocation': parseInt(locationNumber, 10),
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


module.exports = {
  boardsByLocation,
  boardsByPartNumber,
  boardsByVisualInspection,
  boardsByOrderNumber,
  boardShipmentsByReceptionDetails,
  workflowsByUUID,
  apasByRecordDetails,
}
