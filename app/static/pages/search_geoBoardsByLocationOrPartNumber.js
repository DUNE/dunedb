// Declare variables to hold the (initially empty) user-specified board location and/or part number
let receptionLocation = null;
let partNumber = null;


// Main function
$(function () {
  // When the selected location is changed, get the newly selected location from the corresponding page element
  // If the location is valid, perform the appropriate jQuery 'ajax' call to make the search
  $('#locationSelection').on('change', async function () {
    receptionLocation = $('#locationSelection').val();

    if (receptionLocation) {
      $.ajax({
        contentType: 'application/json',
        method: 'GET',
        url: `/json/search/byLocation/${receptionLocation}`,
        dataType: 'json',
        success: postSuccess_location,
      }).fail(postFail);
    }
  });

  // When the selected board part number is changed, get the newly selected part number from the corresponding page element
  // If the part number is valid, perform the appropriate jQuery 'ajax' call to make the search
  $('#partNumberSelection').on('change', async function () {
    partNumber = $('#partNumberSelection').val();

    if (partNumber) {
      $.ajax({
        contentType: 'application/json',
        method: 'GET',
        url: `/json/search/byPartNumber/${partNumber}`,
        dataType: 'json',
        success: postSuccess_partNumber,
      }).fail(postFail);
    }
  });
});


// Function to run for a successful search query by location
function postSuccess_location(result) {
  // Make sure that the page element where the results will be displayed is empty, and then enter an initial message to display
  $('#results').empty();

  const resultsStart = `
    <tr>
      <td colspan = "3">The following geometry boards have been received at <b>${$('#locationSelection option:selected').text()}</b>.</td>
    </tr>
    <tr>
      <td colspan = "3">They are grouped by board part number, and then ordered by last DB record edit (most recent at the top).
        <br>
        <hr>
      </td>
    </tr>`;

  $('#results').append(resultsStart);

  // If there are no search results, display a message to indicate this, but otherwise set up a table of the search results
  if (Object.keys(result).length === 0) {
    $('#results').append('<b>There are no geometry boards at the specified location</b>');
  } else {
    for (const boardGroup of result) {
      const groupCount = `
        <tr>
          <td colspan = "3">Found ${boardGroup.componentUuids.length} boards with part number ${boardGroup.partNumber} (${boardGroup.partString})</td>
        </tr>`;

      $('#results').append(groupCount);
    }

    $('#results').append('<br>');

    for (const boardGroup of result) {
      const groupTitle = `<b>Part Number: ${boardGroup.partNumber}  (${boardGroup.partString})</b>`;

      $('#results').append(groupTitle);

      const tableStart = `
        <tr>
          <th scope = 'col' width = '50%'>Board UUID</th>
          <th scope = 'col' width = '15%'>UKID</th>
          <th scope = 'col' width = '35%'>Received On:</th>
        </tr>`;

      $('#results').append(tableStart);

      for (const i in boardGroup.componentUuids) {
        const boardText = `
          <tr>
            <td><a href = '/component/${boardGroup.componentUuids[i]}' target = '_blank'</a>${boardGroup.componentUuids[i]}</td>
            <td>${boardGroup.ukids[i]}</td>
            <td>${boardGroup.receptionDates[i]}</td>
          </tr>`;

        $('#results').append(boardText);
      }

      $('#results').append('<br>');
    }
  }
};


// Function to correctly format a board location string
function formatBoardLocation(rawLocationString) {
  let location = '';

  if (!rawLocationString) location = '[unknown]';
  else {
    location = rawLocationString;

    if (location === 'williamAndMary') location = 'William and Mary';
    else if (location === 'uwPsl') location = 'UW / PSL';
    else location = location[0].toUpperCase() + location.slice(1);
  }

  return location;
};


// Function to run for a successful search query by part number
function postSuccess_partNumber(result) {
  // Make sure that the page element where the results will be displayed is empty, and then enter an initial message to display
  $('#results').empty();

  const resultsStart = `
    <tr>
      <td colspan = "3">The following geometry boards with part number <b>${$('#partNumberSelection option:selected').text()}</b> have been received.</td>
    </tr>
    <tr>
      <td colspan = "3">They are grouped by reception location, and then ordered by last DB record edit (most recent at the top).
        <br>
        <hr>
      </td>
    </tr>`;

  $('#results').append(resultsStart);

  // If there are no search results, display a message to indicate this, but otherwise set up a table of the search results
  if (Object.keys(result).length === 0) {
    $('#results').append('<b>No geometry boards of the given part number have been received at any location</b>');
  } else {
    for (const boardGroup of result) {
      const groupCount = `
        <tr>
          <td colspan = "3">Found ${boardGroup.componentUuids.length} boards received at ${formatBoardLocation(boardGroup.receptionLocation)}</td>
        </tr>`;

      $('#results').append(groupCount);
    }

    $('#results').append('<br>');

    for (const boardGroup of result) {
      const groupTitle = `<b>Location: ${formatBoardLocation(boardGroup.receptionLocation)}</b>`;

      $('#results').append(groupTitle);

      const tableStart = `
        <tr>
          <th scope = 'col' style = 'width: 50%'>Board UUID</th>
          <th scope = 'col' style = 'width: 15%'>UKID</th>
          <th scope = 'col' style = 'width: 35%'>Received On:</th>
        </tr>`;

      $('#results').append(tableStart);

      for (const i in boardGroup.componentUuids) {
        const boardText = `
          <tr>
            <td><a href = '/component/${boardGroup.componentUuids[i]}' target = '_blank'</a>${boardGroup.componentUuids[i]}</td>
            <td>${boardGroup.ukids[i]}</td>
            <td>${boardGroup.receptionDates[i]}</td>
          </tr>`;

        $('#results').append(boardText);
      }

      $('#results').append('<br>');
    }
  }
};


// Function to run for a failed search query of either scenario
function postFail(result, statusCode, statusMsg) {
  // If the query result contains a response message, display it, and if not, display any status message and error code instead
  if (result.responseText) {
    console.log('POSTFAIL: ', result.responseText);
  } else {
    console.log('POSTFAIL: ', `${statusMsg} (${statusCode})`);
  }
};
