// Declare variables to hold the (initially empty) user-specified board location, part number and status
let boardLocation = null;
let boardPartNumber = null;
let boardStatus = 'any';


// Run a specific function when the page is loaded
window.addEventListener('load', renderSearchForms);


// Function to run when the page is loaded
async function renderSearchForms() {
  // When the selected location is changed, get the newly selected location
  $('#locationSelection').on('change', async function () {
    boardLocation = $('#locationSelection').val();
  });

  // When the selected board part number is changed, get the newly selected part number
  $('#partNumberSelection').on('change', async function () {
    boardPartNumber = $('#partNumberSelection').val();
  });

  // When the selected status is changed, get the newly selected status
  $('#statusSelection').on('change', async function () {
    boardStatus = $('#statusSelection').val();
  });

  // When the 'Perform Search' button is pressed, perform the search using the appropriate jQuery 'ajax' call and the current values of the search parameters
  // Additionally, disable the 'Perform Search' button while the current search is being performed
  $('#confirmButton').on('click', function () {
    $('#confirmButton').prop('disabled', true);

    if (boardLocation) {
      $.ajax({
        contentType: 'application/json',
        method: 'GET',
        url: `/json/search/geoBoardsByLocation/${boardLocation}/${boardStatus}`,
        dataType: 'json',
        success: postSuccess_location,
      }).fail(postFail);
    } else if (boardPartNumber) {
      $.ajax({
        contentType: 'application/json',
        method: 'GET',
        url: `/json/search/geoBoardsByPartNumber/${boardPartNumber}/${boardStatus}`,
        dataType: 'json',
        success: postSuccess_partNumber,
      }).fail(postFail);
    }
  })
}


// Function to run for a successful search query by location
function postSuccess_location(result) {
  // Make sure that the page element where the results will be displayed is empty, and then enter an initial message to display
  $('#results').empty();

  const resultsStart = `
    <tr>
      <td colspan = "3">The following geometry boards are at <b>${$('#locationSelection option:selected').text()}</b>.</td>
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
          <td colspan = "3">Found ${boardGroup.componentUuids.length} boards with part number <b>${boardGroup.partNumber} (${boardGroup.partString})</b></td>
        </tr>`;

      $('#results').append(groupCount);
    }

    $('#results').append('<br>');

    for (const boardGroup of result) {
      const groupTitle = `
        <tr>
          <td colspan = "3"><b>Part Number: ${boardGroup.partNumber}  (${boardGroup.partString})</b></td>
        </tr>`;

      $('#results').append(groupTitle);

      const tableStart = `
        <tr>
          <th scope = 'col' style = 'width: 25%'>Board UKID</th>
          <th scope = 'col' style = 'width: 25%'>Date at Location</th>
          <th scope = 'col' style = 'width: 50%'>Installed on APA</th>
        </tr>`;

      $('#results').append(tableStart);

      for (const i in boardGroup.componentUuids) {
        const boardText = `
          <tr>
            <td><a href = '/component/${boardGroup.componentUuids[i]}' target = '_blank'</a>${boardGroup.ukids[i]}</td>
            <td>${boardGroup.receptionDates[i]}</td>
            <td>${boardGroup.installedOnAPA[i]}</td>
          </tr>`;

        $('#results').append(boardText);
      }

      $('#results').append('<br>');
    }
  }

  // Re-enable the 'Perform Search' button for the next search
  $('#confirmButton').prop('disabled', false);
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
      <td colspan = "3">They are grouped by location, and then ordered by last DB record edit (most recent at the top).
        <br>
        <hr>
      </td>
    </tr>`;

  $('#results').append(resultsStart);

  // If there are no search results, display a message to indicate this, but otherwise set up a table of the search results
  if (Object.keys(result).length === 0) {
    $('#results').append('<b>No geometry boards of the given part number are at any location</b>');
  } else {
    for (const boardGroup of result) {
      const groupCount = `
        <tr>
          <td colspan = "3">Found ${boardGroup.componentUuids.length} boards at <b>${dictionary_locations[boardGroup.receptionLocation]}</b></td>
        </tr>`;

      $('#results').append(groupCount);
    }

    $('#results').append('<br>');

    for (const boardGroup of result) {
      const groupTitle = `
        <tr>
          <td colspan = "3"><b>Location: ${dictionary_locations[boardGroup.receptionLocation]}</b></td>
        </tr>`;

      $('#results').append(groupTitle);

      const tableStart = `
        <tr>
          <th scope = 'col' style = 'width: 25%'>Board UKID</th>
          <th scope = 'col' style = 'width: 25%'>Date at Location</th>
          <th scope = 'col' style = 'width: 50%'>Installed on APA</th>
        </tr>`;

      $('#results').append(tableStart);

      for (const i in boardGroup.componentUuids) {
        const boardText = `
          <tr>
            <td><a href = '/component/${boardGroup.componentUuids[i]}' target = '_blank'</a>${boardGroup.ukids[i]}</td>
            <td>${boardGroup.receptionDates[i]}</td>
            <td>${boardGroup.installedOnAPA[i]}</td>
          </tr>`;

        $('#results').append(boardText);
      }

      $('#results').append('<br>');
    }
  }

  // Re-enable the 'Perform Search' button for the next search
  $('#confirmButton').prop('disabled', false);
};


// Function to run for a failed search query of either scenario
function postFail(result, statusCode, statusMsg) {
  // If the query result contains a response message, display it, and if not, display any status message and error code instead
  if (result.responseText) {
    console.log('POSTFAIL: ', result.responseText);
  } else {
    console.log('POSTFAIL: ', `${statusMsg} (${statusCode})`);
  }

  // Re-enable the 'Perform Search' button for the next search
  $('#confirmButton').prop('disabled', false);
};
