const MUUID = require('uuid-mongodb');

const Actions = require('./Actions');
const Components = require('./Components');
const { db } = require('./db');


/// Retrieve a list of geometry boards that are at a specified location across all part numbers
async function boardsByLocation(location, acceptanceStatus, toothStripStatus) {
  let aggregation_stages = [];

  // Match against the type form ID and specified location to get records of all 'Geometry Board' components currently at this location
  aggregation_stages.push({
    $match: {
      'formId': 'GeometryBoard',
      'reception.location': location,
    }
  });

  // Select the latest version of each record, and pass through only the fields required for later use
  aggregation_stages.push({ $sort: { 'validity.version': -1 } });
  aggregation_stages.push({
    $group: {
      _id: { componentUuid: '$componentUuid' },
      partNumber: { '$first': '$data.partNumber' },
      partString: { '$first': '$data.partString' },
      componentUuid: { '$first': '$componentUuid' },
      ukid: { '$first': '$data.typeRecordNumber' },
    },
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
  // In addition, filter the results based on the optional 'board acceptance status' and 'tooth strip attachment status' search parameters
  let cleanedResults = [];

  for (const boardGroup of results) {
    let cleanedBoardGroup = {};

    cleanedBoardGroup.partNumber = boardGroup._id.partNumber;
    cleanedBoardGroup.partString = boardGroup._id.partString;

    cleanedBoardGroup.componentUuids = [];
    cleanedBoardGroup.ukids = [];
    cleanedBoardGroup.receptionDates = [];
    cleanedBoardGroup.installedOnAPA = [];

    for (const boardUuid of boardGroup.componentUuid) {
      let boardAccepted = false;
      let includeBoard_basedOnAcceptanceStatus = false;

      let match_condition = {
        typeFormId: 'FactoryBoardRejection',
        componentUuid: MUUID.from(boardUuid).toString(),
      };

      const rejectionActions = await Actions.list(match_condition);

      if (rejectionActions.length === 0) boardAccepted = true;
      else {
        const rejectionAction = await Actions.retrieve(rejectionActions[0].actionId);
        const disposition = rejectionAction.data.disposition;

        if (((disposition === 'useAsIs') || (disposition === 'remediated'))) boardAccepted = true;
      }

      if ((acceptanceStatus === 'any') || ((acceptanceStatus === 'accepted') && (boardAccepted == true)) || (acceptanceStatus == 'rejected') && (boardAccepted == false)) {
        includeBoard_basedOnAcceptanceStatus = true;
      }

      let toothStripAttached = false;
      let includeBoard_basedOnToothStripStatus = false;

      match_condition = {
        typeFormId: 'BoardToothStripAttachment',
        componentUuid: MUUID.from(boardUuid).toString(),
      }

      const toothStripAttachmentActions = await Actions.list(match_condition);

      if (toothStripAttachmentActions.length > 0) toothStripAttached = true;

      if ((toothStripStatus === 'any') || ((toothStripStatus === 'attached') && (toothStripAttached == true)) || (toothStripStatus == 'notAttached') && (toothStripAttached == false)) {
        includeBoard_basedOnToothStripStatus = true;
      }

      if (includeBoard_basedOnAcceptanceStatus && includeBoard_basedOnToothStripStatus) {
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

            const name_splits = apa.data.name.split('-');
            cleanedBoardGroup.installedOnAPA.push(`${name_splits[1]}-${name_splits[2]}`.slice(0, -3));
          } else {
            cleanedBoardGroup.installedOnAPA.push('[No APA UUID found!]');
          }
        } else {
          cleanedBoardGroup.installedOnAPA.push('[Not installed on APA]');
        }
      }
    }

    if (cleanedBoardGroup.componentUuids.length > 0) cleanedResults.push(cleanedBoardGroup);
  }

  // Return the list of boards grouped by part numbers
  return cleanedResults;
}


/// Retrieve a list of geometry boards of a specified part number across all board locations
async function boardsByPartNumber(partNumber, acceptanceStatus, toothStripStatus) {
  let aggregation_stages = [];

  // Match against the type form ID and specified part number to get records of all 'Geometry Board' components of this part number
  aggregation_stages.push({
    $match: {
      'formId': 'GeometryBoard',
      'data.partNumber': partNumber,
    }
  });

  // Select the latest version of each record, and pass through only the fields required for later use
  aggregation_stages.push({ $sort: { 'validity.version': -1 } });
  aggregation_stages.push({
    $group: {
      _id: { componentUuid: '$componentUuid' },
      componentUuid: { '$first': '$componentUuid' },
      receptionLocation: { '$first': '$reception.location' },
      ukid: { '$first': '$data.typeRecordNumber' },
    },
  });

  aggregation_stages.push({ $sort: { 'ukid': 1 } });

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
  // In addition, filter the results based on the optional 'board acceptance status' and 'tooth strip attachment status' search parameters
  let cleanedResults = [];

  for (const boardGroup of results) {
    let cleanedBoardGroup = {};

    cleanedBoardGroup.receptionLocation = boardGroup._id.receptionLocation;

    cleanedBoardGroup.componentUuids = [];
    cleanedBoardGroup.ukids = [];
    cleanedBoardGroup.receptionDates = [];
    cleanedBoardGroup.installedOnAPA = [];

    for (const boardUuid of boardGroup.componentUuid) {
      let boardAccepted = false;
      let includeBoard_basedOnAcceptanceStatus = false;

      let match_condition = {
        typeFormId: 'FactoryBoardRejection',
        componentUuid: MUUID.from(boardUuid).toString(),
      };

      const rejectionActions = await Actions.list(match_condition);

      if (rejectionActions.length === 0) boardAccepted = true;
      else {
        const rejectionAction = await Actions.retrieve(rejectionActions[0].actionId);
        const disposition = rejectionAction.data.disposition;

        if (((disposition === 'useAsIs') || (disposition === 'remediated'))) boardAccepted = true;
      }

      if ((acceptanceStatus === 'any') || ((acceptanceStatus === 'accepted') && (boardAccepted == true)) || (acceptanceStatus == 'rejected') && (boardAccepted == false)) {
        includeBoard_basedOnAcceptanceStatus = true;
      }

      let toothStripAttached = false;
      let includeBoard_basedOnToothStripStatus = false;

      match_condition = {
        typeFormId: 'BoardToothStripAttachment',
        componentUuid: MUUID.from(boardUuid).toString(),
      }

      const toothStripAttachmentActions = await Actions.list(match_condition);

      if (toothStripAttachmentActions.length > 0) toothStripAttached = true;

      if ((toothStripStatus === 'any') || ((toothStripStatus === 'attached') && (toothStripAttached == true)) || (toothStripStatus == 'notAttached') && (toothStripAttached == false)) {
        includeBoard_basedOnToothStripStatus = true;
      }

      if (includeBoard_basedOnAcceptanceStatus && includeBoard_basedOnToothStripStatus) {
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

            const name_splits = apa.data.name.split('-');
            cleanedBoardGroup.installedOnAPA.push(`${name_splits[1]}-${name_splits[2]}`.slice(0, -3));
          } else {
            cleanedBoardGroup.installedOnAPA.push('[No APA UUID found!]');
          }
        } else {
          cleanedBoardGroup.installedOnAPA.push('[Not installed on APA]');
        }
      }
    }

    if (cleanedBoardGroup.componentUuids.length > 0) cleanedResults.push(cleanedBoardGroup);
  }

  // Return the list of boards grouped by location
  return cleanedResults;
}


/// Retrieve a list of geometry boards that have a specified visual inspection disposition across all order numbers
async function boardsByVisualInspection(disposition, issue) {
  let action_aggregation_stages = [];

  // Match against the type form ID to get records of all 'Visual Inspection' actions
  action_aggregation_stages.push({
    $match: {
      'typeFormId': 'BoardVisualInspection',
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
      'formId': 'GeometryBoard',
      'componentUuid': { $in: componentUUIDs }
    }
  });

  // Select the latest version of each record, and pass through only the fields required for later use
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

      // Match against the type form ID and component UUID to get records of all 'Visual Inspection' actions that have been performed on this board
      perBoard_action_aggregation_stages.push({
        $match: {
          'typeFormId': 'BoardVisualInspection',
          'componentUuid': MUUID.from(boardUuid),
        }
      });

      // Order the records by the '_id' field (highest value first) - this ObjectID is generated sequentially for each record (higher ones for newer records) ... 
      // ... this is a work-around for the fact that we don't save the record insertion dates as actual date objects which can be sorted, but instead as strings which are more tricky to order)
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
          $match: { 'formId': 'ReturnedGeometryBoardBatch' }
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

    cleanedResults.push(cleanedBoardGroup);
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
      'formId': { $in: ['GeometryBoardBatch', 'ReturnedGeometryBoardBatch'] },
    }
  });

  // Select the latest version of each record, and pass through only the fields required for later use
  // Note that because the sub-component geometry board UUID structure is different between the two types of batches, we must attempt to pass both of them ...
  // ... the one that doesn't exist for the given batch type will just be an empty field
  comp_aggregation_stages.push({ $sort: { 'validity.version': -1 } });
  comp_aggregation_stages.push({
    $group: {
      _id: { componentUuid: '$componentUuid' },
      typeFormId: { '$first': '$formId' },
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

    // Match against the type form ID and component UUID to get records of all 'Visual Inspection' actions that have been performed on the sub-component geometry boards
    action_aggregation_stages.push({
      $match: {
        'typeFormId': 'BoardVisualInspection',
        'componentUuid': { $in: boardUUIDs },
      }
    });

    // Select the latest version of each record, and pass through only the fields required for later use
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

    // At this point, we have the latest version of every 'Visual Inspection' action performed on each board
    // Select the single action that was mostly recently performed on each board, and pass through only the fields required for later use
    // Note that this starts by ordering the records by the '_id' field (highest value first) - this ObjectID is generated sequentially for each record (higher ones for newer records) ... 
    // ... this is a work-around for the fact that we don't save the record insertion dates as actual date objects which can be sorted, but instead as strings which are more tricky to order)
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

      cleanedResults.push(cleanedDispositionGroup);
    }

    // Return the list of boards grouped by disposition
    return cleanedResults;
  }

  // If no matching geometry board batches are found (i.e. the whole of the 'if' statement above is skipped), return an empty list
  return [];
}


module.exports = {
  boardsByLocation,
  boardsByPartNumber,
  boardsByVisualInspection,
  boardsByOrderNumber,
}    