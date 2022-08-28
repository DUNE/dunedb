const MUUID = require('uuid-mongodb');

const Components = require('lib/Components.js');
const { db } = require('./db');


/// Retrieve a list of geometry boards that have been received at a specified location across all part numbers
async function boardsByLocation(location) {
  // Set up the 'aggregation stages' of the database query - these are the query steps in sequence
  let aggregation_stages = [];

  // First, we must retrieve a list of all boards that have the same reception location as the specified one
  // So set up a match stage covering both the type form and the reception location
  aggregation_stages.push({
    $match: {
      'formId': 'GeometryBoard',
      'reception.location': location,
    }
  });

  // Next we want to remove all but the most recent version of each matching record
  // First sort the matching records by validity ... highest version first
  aggregation_stages.push({ $sort: { 'validity.version': -1 } });

  // Then group the records by whatever fields will be subsequently used
  // For example, if the 'componentUuid' of each returned record is to be used later on, it must be one of the groups defined here
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

  // We want to display the matched boards grouped by the board part numbers
  // So set up second group stage for this (i.e. the '$group' operator's '_id' field is now the board's part number field)
  // Then add the remaining fields to be preserved for each board in each group
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

  // Query the 'components' records collection using the aggregation stages
  let results = await db.collection('components')
    .aggregate(aggregation_stages)
    .toArray();

  // The query results are a bit of a mess at this point ... unnecessarily nested, board UUIDs in binary format, etc.
  // Clean them up to make it easier to display them on the search results page
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
  // Set up the 'aggregation stages' of the database query - these are the query steps in sequence
  let aggregation_stages = [];

  // First, we must retrieve a list of all boards that have the same part number as the specified one
  // So set up a match stage covering both the type form and the part number
  aggregation_stages.push({
    $match: {
      'formId': 'GeometryBoard',
      'data.partNumber': partNumber,
    }
  });

  // Next we want to remove all but the most recent version of each matching record
  // First sort the matching records by validity ... highest version first
  aggregation_stages.push({ $sort: { 'validity.version': -1 } });

  // Then group the records by whatever fields will be subsequently used
  // For example, if the 'componentUuid' of each returned record is to be used later on, it must be one of the groups defined here
  aggregation_stages.push({
    $group: {
      _id: { componentUuid: '$componentUuid' },
      componentUuid: { '$first': '$componentUuid' },
      ukid: { '$first': '$data.typeRecordNumber' },
      receptionDate: { '$first': '$reception.date' },
      receptionLocation: { '$first': '$reception.location' },
    },
  });

  // We want to display the matched boards grouped by the reception location
  // So set up second group stage for this (i.e. the '$group' operator's '_id' field is now the board's reception location field)
  // Then add the remaining fields to be preserved for each board in each group
  aggregation_stages.push({
    $group: {
      _id: { receptionLocation: '$receptionLocation' },
      componentUuid: { $push: '$componentUuid' },
      ukid: { $push: '$ukid' },
      receptionDate: { $push: '$receptionDate' },
    }
  });

  // Query the 'components' records collection using the aggregation stages
  let results = await db.collection('components')
    .aggregate(aggregation_stages)
    .toArray();

  // The query results are a bit of a mess at this point ... unnecessarily nested, board UUIDs in binary format, etc.
  // Clean them up to make it easier to display them on the search results page
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
  // Set up the 'aggregation stages' of the 'actions' database query - these are the query steps in sequence
  let action_aggregation_stages = [];

  // First, we must retrieve a list of all 'Visual Inspection' action records that have the same disposition result as the specified one
  // So set up a match stage covering both the type form and the disposition
  action_aggregation_stages.push({
    $match: {
      'typeFormId': 'BoardVisualInspection',
      'data.nonConformingDisposition': disposition,
    }
  });

  // Next we want to remove all but the most recent version of each matching record
  // First sort the matching records by validity ... highest version first
  action_aggregation_stages.push({ $sort: { 'validity.version': -1 } });

  // Then group the records by whatever fields will be subsequently used
  // For example, if the 'actionId' of each returned record is to be used later on, it must be one of the groups defined here
  action_aggregation_stages.push({
    $group: {
      _id: { actionId: '$actionId' },
      actionId: { '$first': '$actionId' },
      componentUuid: { '$first': '$componentUuid' },
      data: { '$first': '$data' },
    },
  });

  // Query the 'actions' records collection using the aggregation stages
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

  // Set up a new set of 'aggregation stages' for the 'components' database query
  let comp_aggregation_stages = [];

  // First, we must retrieve a list of all geometry board component records with UUIDs matching those from the action records
  // We can do this by directly matching against any entries in the UUIDs list above
  comp_aggregation_stages.push({
    $match: {
      'formId': 'GeometryBoard',
      'componentUuid': { $in: componentUUIDs }
    }
  });

  // Next we want to remove all but the most recent version of each matching record
  // First sort the matching records by validity ... highest version first
  comp_aggregation_stages.push({ $sort: { 'validity.version': -1 } });

  // Then group the records by whatever fields will be subsequently used
  // For example, if the 'componentUuid' of each returned record is to be used later on, it must be one of the groups defined here
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

  // We want to display the matched boards grouped by the board part numbers
  // So set up second group stage for this (i.e. the '$group' operator's '_id' field is now the board's part number field)
  // Then add the remaining fields to be preserved for each board in each group
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

  // Query the 'components' records collection using the aggregation stages
  let component_results = await db.collection('components')
    .aggregate(comp_aggregation_stages)
    .toArray();

  // The query results are a bit of a mess at this point ... unnecessarily nested, board UUIDs in binary format, unconnected action information, etc.
  // Clean them up to make it easier to display them on the search results page
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
  // Set up the 'aggregation stages' of the first 'components' database query - these are the query steps in sequence
  let comp_aggregation_stages = [];

  // First, we must retrieve the most recent version of the 'Geometry Board Batch' component record that corresponds to the specified order number
  // So set up a match stage covering both the type form and the order number
  comp_aggregation_stages.push({
    $match: {
      'formId': 'GeometryBoardBatch',
      'data.orderNumber': orderNumber,
    }
  });

  // In case there are multiple versions of the record, sort the matching records by validity ... highest version first
  comp_aggregation_stages.push({ $sort: { 'validity.version': -1 } });

  // Then group the records by whatever fields will be subsequently used
  // For example, if the 'componentUuid' of each returned record is to be used later on, it must be one of the groups defined here
  comp_aggregation_stages.push({
    $group: {
      _id: { componentUuid: '$componentUuid' },
      boardUuids: { '$first': '$data.subComponent_fullUuids' },
    },
  });

  // Query the 'components' records collection using the aggregation stages
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

    // Set up a new set of 'aggregation stages' for the 'actions' database query
    let action_aggregation_stages = [];

    // First, we must retrieve a list of all 'Visual Inspection' action records with UUIDs matching those from the batch record
    // We can do this by directly matching against any entries in the UUIDs list above
    action_aggregation_stages.push({
      $match: {
        'typeFormId': 'BoardVisualInspection',
        'componentUuid': { $in: boardUUIDs },
      }
    });

    // Next we want to remove all but the most recent version of each matching record
    // First sort the matching records by validity ... highest version first
    action_aggregation_stages.push({ $sort: { 'validity.version': -1 } });

    // Then group the records by whatever fields will be subsequently used
    // For example, if the 'actionId' of each returned record is to be used later on, it must be one of the groups defined here
    action_aggregation_stages.push({
      $group: {
        _id: { actionId: '$actionId' },
        actionId: { '$first': '$actionId' },
        componentUuid: { '$first': '$componentUuid' },
        disposition: { '$first': '$data.nonConformingDisposition' },
        data: { '$first': '$data' },
      },
    });

    // We want to display the matched boards grouped by the disposition
    // So set up second group stage for this (i.e. the '$group' operator's '_id' field is now the board's disposition field)
    // Then add the remaining fields to be preserved for each board in each group
    action_aggregation_stages.push({
      $group: {
        _id: {
          disposition: '$disposition',
        },
        actionId: { $push: '$actionId' },
        componentUuid: { $push: '$componentUuid' },
        data: { $push: '$data' },
      }
    });

    // Query the 'actions' records collection using the aggregation stages
    let action_results = await db.collection('actions')
      .aggregate(action_aggregation_stages)
      .toArray();

    // The query results are a bit of a mess at this point ... unnecessarily nested, board UUIDs in binary format, etc.
    // Clean them up to make it easier to display them on the search results page
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

  return [];
}


module.exports = {
  boardsByLocation,
  boardsByPartNumber,
  boardsByVisualInspection,
  boardsByOrderNumber,
}
