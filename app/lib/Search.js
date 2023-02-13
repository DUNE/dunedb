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
async function boardsByVisualInspection(disposition, issue) {
  // Set up a dictionary of match conditions ... this includes the two required fields (matching against 'Visual Inspection' actions with the specified disposition), and also an optional field
  // The optional field has a variable name, since it depends on the specific issue being queried ... the string to match against must be first set separately, and then added to the dictionary
  let matchConditions = {
    'typeFormId': 'BoardVisualInspection',
    'data.nonConformingDisposition': disposition,
  };

  if (issue) {
    const issueFieldString = `data.visualInspectionIssues.${issue}`;
    matchConditions[issueFieldString] = true;
  }

  let action_aggregation_stages = [];

  // Retrieve all action records that match the specified matching conditions
  action_aggregation_stages.push({ $match: matchConditions });

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
    cleanedBoardGroup.ukids = [];
    cleanedBoardGroup.batchUuids = [];
    cleanedBoardGroup.orderNumbers = [];

    for (let [index, boardUuid] of boardGroup.componentUuid.entries()) {
      // Any given board may have had multiple visual inspections performed on it (i.e. one at initial intake, and then another after being returned from repairs by the manufacturer)
      // However, only the latest inspection matters - i.e. if the first inspection of a particular board matches the originally queried disposition, but the second inspection doesn't ...
      // ... we DO NOT want that board to be included in the search results

      // Retrieve all 'Visual Inspection' action records that have the same component UUID as the board
      let perBoard_aggregation_stages = [];

      perBoard_aggregation_stages.push({
        $match: {
          'typeFormId': 'BoardVisualInspection',
          'componentUuid': MUUID.from(boardUuid),
        }
      });

      // Sort the matching records such that the most recent one is first
      // Do this by sorting by the '_id' field ... highest value first (this ObjectID is generated sequentially for each record, so higher ones should correspond to newer records ...
      // ... this is a work-around for the fact that we don't save the record insertion dates as actual date objects which can be sorted, but instead as strings which are more tricky to order)
      perBoard_aggregation_stages.push({ $sort: { _id: -1 } });

      // Query the 'actions' records collection using the aggregation stages defined above
      let perBoard_results = await db.collection('actions')
        .aggregate(perBoard_aggregation_stages)
        .toArray();

      // Compare the action IDs of the two visual inspection records for this board: a) the one that matched the queried disposition, and b) the latest performed one
      // ONLY if the action IDs are identical, i.e. the latest visual inspection is the one that matches the queried disposition, then include this board in the search results
      if (perBoard_results[0].actionId.toString() === uuidsAndIds[boardUuid].toString()) {
        cleanedBoardGroup.componentUuids.push(MUUID.from(boardUuid).toString());
        cleanedBoardGroup.actionIds.push(uuidsAndIds[boardUuid]);
        cleanedBoardGroup.inspectionData.push(uuidsAndData[boardUuid]);
        cleanedBoardGroup.ukids.push(boardGroup.ukid[index]);
        cleanedBoardGroup.batchUuids.push(boardGroup.batchUuid[index]);

        const batch = await Components.retrieve(boardGroup.batchUuid[index]);

        cleanedBoardGroup.orderNumbers.push(batch.data.orderNumber);
      }
    }

    cleanedResults.push(cleanedBoardGroup);
  }

  // Return the list of boards grouped by part numbers
  return cleanedResults;
}


/// Retrieve a list of geometry boards of a specified order number across all visual inspection dispositions
async function boardsByOrderNumber(orderNumber) {
  let queryResult_componentType = 'GeometryBoardBatch';
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

  // If no results have been found, it could be that the specified order number is related to a 'Returned Geometry Boards Batch' record
  // Repeat the same query as above, but now for records that match that component type (with corresponding grouping field names, which are slightly different)
  if (batch_results.length == 0) {
    queryResult_componentType = 'ReturnedGeometryBoardBatch';
    comp_aggregation_stages = [];

    comp_aggregation_stages.push({
      $match: {
        'formId': 'ReturnedGeometryBoardBatch',
        'data.orderNumber': orderNumber,
      }
    });

    comp_aggregation_stages.push({ $sort: { 'validity.version': -1 } });
    comp_aggregation_stages.push({
      $group: {
        _id: { componentUuid: '$componentUuid' },
        boardUuids: { '$first': '$data.boardUuids' },
      },
    });

    batch_results = await db.collection('components')
      .aggregate(comp_aggregation_stages)
      .toArray();
  }

  if (batch_results.length > 0) {
    // At this stage we have a single geometry board batch record containing (among other values) a list of the individual board UUIDs
    // But what we actually want is the single latest visual inspection action record for each individual board

    // Extract an array of the individual board UUIDs ... the structure is slightly different depending on the component type of the query result
    let boardUUIDs = [];

    if (queryResult_componentType === 'GeometryBoardBatch') {
      for (const boardUUID of batch_results[0].boardUuids) {
        boardUUIDs.push(MUUID.from(boardUUID));
      }
    } else {
      for (const boardUUID of batch_results[0].boardUuids) {
        boardUUIDs.push(MUUID.from(boardUUID.component_uuid));
      }
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

    // At this point we have a list of the latest versions of every 'Visual Inspection' action performed on the board ... now select the single latest one
    // First sort the matching records by the '_id' field ... highest value first (this ObjectID is generated sequentially for each record, so higher ones should correspond to newer records ...
    // ... this is a work-around for the fact that we don't save the record insertion dates as actual date objects which can be sorted, but instead as strings which are more tricky to order)
    // Then group the records by the component UUID (i.e. each group contains all actions performed on the same component), and select only the first (latest) entry in each group
    // Finally, set which fields in the first record are to be returned for use in subsequent aggregation stages
    action_aggregation_stages.push({ $sort: { _id: -1 } });
    action_aggregation_stages.push({
      $group: {
        _id: { componentUuid: '$componentUuid' },
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


/// Retrieve a list of APA non-conformance actions that matched the specified non-conformance type
async function apasByNonConformance(nonConformance) {
  let aggregation_stages = [];

  // Retrieve all 'APA Non-Conformance' action records
  aggregation_stages.push({
    $match: { 'typeFormId': 'APANonConformance' }
  });

  // Select only the latest version of each record
  // First sort the matching records by validity ... highest version first
  // Then group the records by the action ID (i.e. each group contains all versions of the same action), and select only the first (highest version number) entry in each group
  // Finally, set which fields in the first record are to be returned for use in subsequent aggregation stages
  aggregation_stages.push({ $sort: { 'validity.version': -1 } });
  aggregation_stages.push({
    $group: {
      _id: { actionId: '$actionId' },
      actionId: { '$first': '$actionId' },
      componentUuid: { '$first': '$componentUuid' },
      data: { '$first': '$data' },
    },
  });

  // Query the 'actions' records collection using the aggregation stages defined above
  let results = await db.collection('actions')
    .aggregate(aggregation_stages)
    .toArray();

  // At this stage we have a list of all 'APA Non-Conformance' action records
  // We now want to refine this list to only include those records which match the specified non-conformance type
  // This matching could not be done as part of the query above, because the non-conformance types are stored as a dictionary of [key, value] pairs in the record ...
  // ... and MongoDB does not have functionality for matching against specific dictionary [key, value] pairs within the aggregation stages
  let nonConformanceResults = [];

  // For each action record ...
  for (let result of results) {
    // If the dictionary key corresponding to the specified non-conformance type has a value of 'true' ...
    if (result.data.nonConformanceType[nonConformance] === true) {
      // Retrieve the component record of the corresponding assembled APA
      const assembledAPA = await Components.retrieve(result.componentUuid);

      // Save the APA's name (i.e. DUNE PID) into the results to be returned
      result.componentName = assembledAPA.data.name;

      // Save the finalised result object for return      
      nonConformanceResults.push(result);
    }
  }

  // Return the list of actions
  return nonConformanceResults;
}


module.exports = {
  boardsByLocation,
  boardsByPartNumber,
  boardsByVisualInspection,
  boardsByOrderNumber,
  boardShipmentsByReceptionDetails,
  workflowsByUUID,
  apasByRecordDetails,
  apasByNonConformance,
}
