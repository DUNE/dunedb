const MUUID = require('uuid-mongodb');

const Components = require('./Components');
const { db } = require('./db');


/// Retrieve a list of geometry boards that have a specified visual inspection disposition across all order numbers
async function boardsByVisualInspection(disposition, issue) {
  let action_aggregation_stages = [];

  // Match against the type form ID to get records of all 'Geometry Board Visual Inspection' actions
  action_aggregation_stages.push({
    $match: {
      'typeFormId': 'GeometryBoardVisualInspection',
    }
  });

  // Select the latest version of each record, and pass through only the fields required for later use
  action_aggregation_stages.push({ $sort: { 'recordVersion': -1 } });
  action_aggregation_stages.push({
    $group: {
      _id: { actionId: '$actionId' },
      actionId: { '$first': '$actionId' },
      componentUuid: { '$first': '$componentUuid' },
      data: { '$first': '$data' },
    },
  });

  // Match against the specified visual inspection disposition and issue (the latter is optional, so first check if it has been provided)
  let matchConditions = {
    'data.nonConformingDisposition': disposition,
  };

  if (issue !== 'any') {
    const issueFieldString = `data.visualInspectionIssues.${issue}`;
    matchConditions[issueFieldString] = true;
  }

  action_aggregation_stages.push({ $match: matchConditions });

  // Query the 'actions' records collection using the aggregation stages defined above
  let action_results = await db.collection('actions')
    .aggregate(action_aggregation_stages)
    .toArray();

  // At this point, we have a list of 'Visual Inspection' action records with the specified disposition
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

  // Match against the type form ID and component UUID to get records of all 'Geometry Board' components that the previously found 'Visual Inspection' actions were performed on
  comp_aggregation_stages.push({
    $match: {
      'typeFormId': 'GeometryBoard',
      'componentUuid': { $in: componentUUIDs }
    }
  });

  // Select the latest version of each record, and pass through only the fields required for later use
  comp_aggregation_stages.push({ $sort: { 'recordVersion': -1 } });
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

  comp_aggregation_stages.push({ $sort: { 'ukid': 1 } });

  // Group the records according to the board part number and correponding string, and pass through the fields required for later use
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

  // Sort the record groups to be in numerical order of the part number
  comp_aggregation_stages.push({ $sort: { '_id.partNumber': 1 } });

  // Query the 'components' records collection using the aggregation stages defined above
  let component_results = await db.collection('components')
    .aggregate(comp_aggregation_stages)
    .toArray();

  // Reorganise the query results to make it easier to display them on the interface page
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

      let perBoard_action_aggregation_stages = [];

      // Match against the type form ID and component UUID to get records of all 'Geometry Board Visual Inspection' actions that have been performed on this board
      perBoard_action_aggregation_stages.push({
        $match: {
          'typeFormId': 'GeometryBoardVisualInspection',
          'componentUuid': MUUID.from(boardUuid),
        }
      });

      // Order the records by the '_id' field (highest value first) - this ObjectId is generated sequentially for each record (higher ones for newer records) ... 
      // ... this is a work-around for the fact that we previously didn't save the record dates as actual date objects which can be sorted, but instead as strings which are more tricky to order
      perBoard_action_aggregation_stages.push({ $sort: { _id: -1 } });

      // Query the 'actions' records collection using the aggregation stages defined above
      let perBoard_action_results = await db.collection('actions')
        .aggregate(perBoard_action_aggregation_stages)
        .toArray();

      // Compare the action IDs of the two visual inspection records for this board: a) the one that matched the queried disposition, and b) the latest performed one
      // ONLY if the action IDs are identical, i.e. the latest visual inspection is the one that matches the queried disposition, then include this board in the search results
      if (perBoard_action_results[0].actionId.toString() === uuidsAndIds[boardUuid].toString()) {
        cleanedBoardGroup.componentUuids.push(MUUID.from(boardUuid).toString());
        cleanedBoardGroup.actionIds.push(uuidsAndIds[boardUuid]);
        cleanedBoardGroup.inspectionData.push(uuidsAndData[boardUuid]);
        cleanedBoardGroup.ukids.push(boardGroup.ukid[index]);

        // The board's 'order number' should be that of the MOST RECENT batch of boards that it belonged to ... which could be original intake or a batch of returned boards
        // Check if this board has been part of a returned batch, and if so, use its order number ... otherwise, retrieve the original intake batch and use the order number from that 
        let perBoard_comp_aggregation_stages = [];

        perBoard_comp_aggregation_stages.push({
          $match: { 'typeFormId': 'ReturnedGeometryBoardBatch' }
        });

        perBoard_comp_aggregation_stages.push({ $unwind: '$data.boardUuids' });

        perBoard_comp_aggregation_stages.push({
          $match: { 'data.boardUuids.component_uuid': MUUID.from(boardUuid).toString() }
        });

        perBoard_comp_aggregation_stages.push({ $sort: { _id: -1 } });

        let perBoard_comp_results = await db.collection('components')
          .aggregate(perBoard_comp_aggregation_stages)
          .toArray();

        if (perBoard_comp_results.length > 0) {
          cleanedBoardGroup.batchUuids.push(perBoard_comp_results[0].componentUuid);
          cleanedBoardGroup.orderNumbers.push(perBoard_comp_results[0].data.orderNumber);
        } else {
          const batch = await Components.retrieve(boardGroup.batchUuid[index]);

          cleanedBoardGroup.batchUuids.push(boardGroup.batchUuid[index]);
          cleanedBoardGroup.orderNumbers.push(batch.data.orderNumber);
        }
      }
    }

    if (cleanedBoardGroup.componentUuids.length > 0) cleanedResults.push(cleanedBoardGroup);
  }

  // Return the list of boards grouped by part numbers
  return cleanedResults;
}


/// Retrieve a list of geometry boards of a specified order number across all visual inspection dispositions
async function boardsByOrderNumber(orderNumber) {
  let comp_aggregation_stages = [];

  // Match against the type form ID to get records of all 'Geometry Board Batch' and 'Returned Geometry Board Batch' components
  comp_aggregation_stages.push({
    $match: {
      'typeFormId': { $in: ['GeometryBoardBatch', 'ReturnedGeometryBoardBatch'] },
    }
  });

  // Select the latest version of each record, and pass through only the fields required for later use
  // Note that because the sub-component geometry board UUID structure is different between the two types of batches, we must attempt to pass both of them ...
  // ... the one that doesn't exist for the given batch type will just be an empty field
  comp_aggregation_stages.push({ $sort: { 'recordVersion': -1 } });
  comp_aggregation_stages.push({
    $group: {
      _id: { componentUuid: '$componentUuid' },
      typeFormId: { '$first': '$typeFormId' },
      orderNumber: { '$first': '$data.orderNumber' },
      boardUuids_batch: { '$first': '$data.subComponent_fullUuids' },
      boardUuids_returnedBatch: { '$first': '$data.boardUuids' },
    },
  });

  // Match against the batch order number (since this is unique to each batch, it should return at most one matching record)
  comp_aggregation_stages.push({
    $match: {
      'orderNumber': orderNumber,
    }
  });

  // Query the 'components' records collection using the aggregation stages defined above
  let batch_results = await db.collection('components')
    .aggregate(comp_aggregation_stages)
    .toArray();

  if (batch_results.length > 0) {
    // At this point, we have a single 'Geometry Board Batch' or 'Returned Geometry Board Batch' component record containing a list of the sub-component geometry board UUIDs
    // But what we actually want is the latest version of the 'Visual Inspection' action that was most recently performed on each board

    // Extract an array of the sub-component geometry board UUIDs ... as noted above, the structure is slightly different depending on the batch type
    let boardUUIDs = [];

    if (batch_results[0].typeFormId === 'GeometryBoardBatch') {
      for (const boardUUID of batch_results[0].boardUuids_batch) {
        boardUUIDs.push(MUUID.from(boardUUID));
      }
    } else {
      for (const boardUUID of batch_results[0].boardUuids_returnedBatch) {
        boardUUIDs.push(MUUID.from(boardUUID.component_uuid));
      }
    }

    let action_aggregation_stages = [];

    // Match against the type form ID and component UUID to get records of all 'Geometry Board Visual Inspection' actions that have been performed on the sub-component geometry boards
    action_aggregation_stages.push({
      $match: {
        'typeFormId': 'GeometryBoardVisualInspection',
        'componentUuid': { $in: boardUUIDs },
      }
    });

    // Select the latest version of each record, and pass through only the fields required for later use
    action_aggregation_stages.push({ $sort: { 'recordVersion': -1 } });
    action_aggregation_stages.push({
      $group: {
        _id: { actionId: '$actionId' },
        actionId: { '$first': '$actionId' },
        componentUuid: { '$first': '$componentUuid' },
        disposition: { '$first': '$data.nonConformingDisposition' },
        data: { '$first': '$data' },
      },
    });

    // At this point, we have the latest version of every 'Visual Inspection' action performed on each board
    // Select the single action that was mostly recently performed on each board, and pass through only the fields required for later use
    // Note that this starts by ordering the records by the '_id' field (highest value first) - this ObjectId is generated sequentially for each record (higher ones for newer records) ... 
    // ... this is a work-around for the fact that we previously didn't save the record dates as actual date objects which can be sorted, but instead as strings which are more tricky to order
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

    action_aggregation_stages.push({ $sort: { actionId: 1 } });

    // Group the records according to the disposition, and pass through the fields required for later use
    action_aggregation_stages.push({
      $group: {
        _id: { disposition: '$disposition' },
        actionId: { $push: '$actionId' },
        componentUuid: { $push: '$componentUuid' },
        data: { $push: '$data' },
      }
    });

    // Sort the record groups to be in alphabetical order of the disposition
    action_aggregation_stages.push({ $sort: { '_id.disposition': 1 } });

    // Query the 'actions' records collection using the aggregation stages defined above
    let action_results = await db.collection('actions')
      .aggregate(action_aggregation_stages)
      .toArray();

    // Reorganise the query results to make it easier to display them on the interface page
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

      if (cleanedDispositionGroup.componentUuids.length > 0) cleanedResults.push(cleanedDispositionGroup);
    }

    // Return the list of boards grouped by disposition
    return cleanedResults;
  }

  // If no matching geometry board batches are found (i.e. the whole of the 'if' statement above is skipped), return an empty list
  return [];
}


/// Retrieve a list of geometry boards that have been installed on a particular Assembled APA, specified by its UUID
async function boardsByAPA(apaUUID) {
  let aggregation_stages = [];

  // Match against the type form ID to get records of all 'Geometry Board' components
  aggregation_stages.push({
    $match: {
      'typeFormId': 'GeometryBoard',
    }
  });

  // Select the latest version of each record, and pass through only the fields required for later use
  aggregation_stages.push({ $sort: { 'recordVersion': -1 } });
  aggregation_stages.push({
    $group: {
      _id: { componentUuid: '$componentUuid' },
      partNumber: { '$first': '$data.partNumber' },
      partString: { '$first': '$data.partString' },
      componentUuid: { '$first': '$componentUuid' },
      ukid: { '$first': '$data.typeRecordNumber' },
      location: { '$first': '$location' },
      locationDetail: { '$first': '$locationDetail' },
    },
  });

  // Match against the location and location detail to get only those boards that have been installed on the specified APA
  // Note that for some reason, the APA UUID can be saved into the 'locationDetail' field as EITHER a string OR a MUUID-type object, so we have to account for both possibilities
  aggregation_stages.push({
    $match: {
      'location': 'installed_on_APA',
      'locationDetail': { $in: [apaUUID, MUUID.from(apaUUID)] },
    }
  });

  aggregation_stages.push({ $sort: { 'ukid': 1 } });

  // Group the records according to the board part number and corresponding string, and pass through the fields required for later use
  aggregation_stages.push({
    $group: {
      _id: {
        partNumber: '$partNumber',
        partString: '$partString',
      },
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

  for (const boardGroup of results) {
    let cleanedBoardGroup = {};

    cleanedBoardGroup.partNumber = boardGroup._id.partNumber;
    cleanedBoardGroup.partString = boardGroup._id.partString;

    cleanedBoardGroup.componentUuids = [];
    cleanedBoardGroup.ukids = [];
    cleanedBoardGroup.installationDates = [];

    for (const boardUuid of boardGroup.componentUuid) {
      const board = await Components.retrieve(MUUID.from(boardUuid).toString());

      cleanedBoardGroup.componentUuids.push(MUUID.from(boardUuid).toString());
      cleanedBoardGroup.ukids.push(board.data.typeRecordNumber);
      cleanedBoardGroup.installationDates.push(board.dateAtLocation);
    }

    if (cleanedBoardGroup.componentUuids.length > 0) cleanedResults.push(cleanedBoardGroup);
  }

  // Return the list of boards grouped by part numbers
  return cleanedResults;
}


module.exports = {
  boardsByVisualInspection,
  boardsByOrderNumber,
  boardsByAPA,
}    