const MUUID = require('uuid-mongodb');

const Components = require('./Components');
const { db } = require('./db');


/// Retrieve a list of geometry boards that are at a specified location across all part numbers
async function boardsByLocation(location) {
  let aggregation_stages = [];

  // Retrieve all 'Geometry Board' records that have the same location as the specified one
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
      receptionDetail: { '$first': '$reception.detail' },
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
      receptionDetail: { '$first': '$receptionDetail' },
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

    cleanedBoardGroup.installedOnAPA = [];

    for (const receptionDetail of boardGroup.receptionDetail) {
      if (location === 'installed_on_APA') {
        const component = await Components.retrieve(receptionDetail);
        const name_splits = component.data.name.split('-');
        cleanedBoardGroup.installedOnAPA.push(`${name_splits[1]}-${name_splits[2]}`.slice(0, -3));
      } else {
        cleanedBoardGroup.installedOnAPA.push('[n.a.]');
      }
    }

    cleanedBoardGroup.ukids = boardGroup.ukid;
    cleanedBoardGroup.receptionDates = boardGroup.receptionDate;

    cleanedResults.push(cleanedBoardGroup);
  }

  // Return the list of boards grouped by part numbers
  return cleanedResults;
}


/// Retrieve a list of geometry boards of a specified part number across all board locations
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
      receptionDetail: { '$first': '$reception.detail' },
    },
  });

  // We want to actually display the matched boards grouped by the location
  // So group the records according to the location, and then add the fields to be returned for each board in each group
  aggregation_stages.push({
    $group: {
      _id: { receptionLocation: '$receptionLocation' },
      componentUuid: { $push: '$componentUuid' },
      ukid: { $push: '$ukid' },
      receptionDate: { $push: '$receptionDate' },
      receptionDetail: { '$first': '$receptionDetail' },
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
    cleanedBoardGroup.installedOnAPA = [];

    for (const boardUuid of boardGroup.componentUuid) {
      cleanedBoardGroup.componentUuids.push(MUUID.from(boardUuid).toString());
    }

    for (const receptionDetail of boardGroup.receptionDetail) {
      if (boardGroup._id.receptionLocation === 'installed_on_APA') {
        const component = await Components.retrieve(receptionDetail);
        const name_splits = component.data.name.split('-');
        cleanedBoardGroup.installedOnAPA.push(`${name_splits[1]}-${name_splits[2]}`.slice(0, -3));
      } else {
        cleanedBoardGroup.installedOnAPA.push('[n.a.]');
      }
    }

    cleanedBoardGroup.ukids = boardGroup.ukid;
    cleanedBoardGroup.receptionDates = boardGroup.receptionDate;

    cleanedResults.push(cleanedBoardGroup);
  }

  // Return the list of boards grouped by location
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
      let perBoard_action_aggregation_stages = [];

      perBoard_action_aggregation_stages.push({
        $match: {
          'typeFormId': 'BoardVisualInspection',
          'componentUuid': MUUID.from(boardUuid),
        }
      });

      // Sort the matching records such that the most recent one is first
      // Do this by sorting by the '_id' field ... highest value first (this ObjectID is generated sequentially for each record, so higher ones should correspond to newer records ...
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

        // The board's 'order number' should be that of the MOST RECENT batch of boards that it belonged to ... which could be original intake or returned
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


module.exports = {
  boardsByLocation,
  boardsByPartNumber,
  boardsByVisualInspection,
  boardsByOrderNumber,
}    