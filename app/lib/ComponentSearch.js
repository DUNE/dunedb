const MUUID = require('uuid-mongodb');

const { db } = require('./db');


/// Retrieve a list of geometry boards that have been received at a specified location across all part numbers
/// This is a very specialised function that can only be used for geometry boards, due to the specific way that they are recorded in the DB
async function listBoardsByLocation(location) {
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
/// This is a very specialised function that can only be used for geometry boards, due to the specific way that they are recorded in the DB
async function listBoardsByPartNumber(partNumber) {
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


module.exports = {
  listBoardsByLocation,
  listBoardsByPartNumber,
}
