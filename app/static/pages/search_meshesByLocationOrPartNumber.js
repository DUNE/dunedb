// Declare variables to hold the (initially empty) user-specified part number
let partNumber = null;


// Main function
$(function () {
  // When the selected mesh part number is changed, get the newly selected part number from the corresponding page element
  // If the part number is valid, perform the appropriate jQuery 'ajax' call to make the search
  $('#partNumberSelection').on('change', async function () {
    partNumber = $('#partNumberSelection').val();

    if (partNumber) {
      $.ajax({
        contentType: 'application/json',
        method: 'GET',
        url: `/json/search/meshesByPartNumber/${partNumber}`,
        dataType: 'json',
        success: postSuccess,
      }).fail(postFail);
    }
  });
});


// Function to correctly format a mesh's location string
function formatMeshLocation(rawLocationString) {
  let location = '';

  if (!rawLocationString) location = '[unknown]';
  else {
    location = rawLocationString[0].toUpperCase() + rawLocationString.slice(1);
  }

  return location;
};


// Function to run for a successful search query
function postSuccess(result) {
  // Make sure that the page element where the results will be displayed is empty, and then enter an initial message to display
  $('#results').empty();

  const resultsStart = `
    <tr>
      <td colspan = "3">The following grounding mesh panels with part number <b>${$('#partNumberSelection option:selected').text()}</b> have been received.</td>
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
    $('#results').append('<b>No grounding mesh panels of the given part number have been received at any location</b>');
  } else {
    for (const meshGroup of result) {
      const groupCount = `
        <tr>
          <td colspan = "3">Found ${meshGroup.componentUuids.length} panels received at ${formatMeshLocation(meshGroup.receptionLocation)}</td>
        </tr>`;

      $('#results').append(groupCount);
    }

    $('#results').append('<br>');

    for (const meshGroup of result) {
      const groupTitle = `<b>Location: ${formatMeshLocation(meshGroup.receptionLocation)}</b>`;

      $('#results').append(groupTitle);

      const tableStart = `
        <tr>
          <th scope = 'col' style = 'width: 50%'>Mesh UUID</th>
          <th scope = 'col' style = 'width: 50%'>DUNE PID:</th>
        </tr>`;

      $('#results').append(tableStart);

      for (const i in meshGroup.componentUuids) {
        const boardText = `
          <tr>
            <td><a href = '/component/${meshGroup.componentUuids[i]}' target = '_blank'</a>${meshGroup.componentUuids[i]}</td>
            <td>${meshGroup.dunePids[i]}</td>
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
