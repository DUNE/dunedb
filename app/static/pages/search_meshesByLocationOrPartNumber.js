// Declare variables to hold the user-specified search parameters
let meshPanelLocation = null;
let meshPanelPartNumber = null;

// Run a specific function when the page is loaded
window.addEventListener('load', renderSearchForms);


// Function to run when the page is loaded
async function renderSearchForms() {
  // Get and set the value of any search parameter that is changed
  $('#locationSelection').on('change', async function () {
    meshPanelLocation = $('#locationSelection').val();
  });

  $('#partNumberSelection').on('change', async function () {
    meshPanelPartNumber = $('#partNumberSelection').val();
  });

  // When the appropriate confirmation button is pressed, perform the search by location using the appropriate jQuery 'ajax' call and the current values of the search parameters
  // Additionally, disable both confirmation buttons while the current search is being performed
  $('#confirmButton_location').on('click', function () {
    $('#confirmButton_location').prop('disabled', true);
    $('#confirmButton_partNumber').prop('disabled', true);

    if (meshPanelLocation) {
      $.ajax({
        contentType: 'application/json',
        method: 'GET',
        url: `/json/search/meshesByLocation/${meshPanelLocation}`,
        dataType: 'json',
        success: postSuccess_location,
      }).fail(postFail);
    }
  });

  // When the appropriate confirmation button is pressed, perform the search by part number using the appropriate jQuery 'ajax' call and the current values of the search parameters
  // Additionally, disable both confirmation buttons while the current search is being performed
  $('#confirmButton_partNumber').on('click', function () {
    $('#confirmButton_location').prop('disabled', true);
    $('#confirmButton_partNumber').prop('disabled', true);

    if (meshPanelPartNumber) {
      $.ajax({
        contentType: 'application/json',
        method: 'GET',
        url: `/json/search/meshesByPartNumber/${meshPanelPartNumber}`,
        dataType: 'json',
        success: postSuccess_partNumber,
      }).fail(postFail);
    }
  });
}


// Function to run for a successful search query by location
function postSuccess_location(result) {
  // Set up a dictionary containing the grounding mesh panel part number [key, string] pairs (taken directly from the 'Grounding Mesh Panel' component type form)
  const partNumbersDictionary = {
    mesh29410560HeadEndLH: '294-10560 HEAD END - L/H',
    mesh29410561HeadEndRH: '294-10561 HEAD END - R/H',
    mesh29410562FootEndRH: '294-10562 FOOT END - R/H',
    mesh29410563FootEndLH: '294-10563 FOOT END - L/H',
    mesh29410564Centre: '294-10564 CENTRE',
  };

  // Make sure that the page element where the results will be displayed is empty, and then enter an initial message to display
  $('#results').empty();

  const resultsStart = `
    <tr>
      <td colspan = "3">The following grounding mesh panels are at <b>${$('#locationSelection option:selected').text()}</b>.</td>
    </tr>
    <tr>
      <td colspan = "3">They are grouped by part number, and then ordered by increasing DUNE PID within each group.
        <br>
        <hr>
      </td>
    </tr>`;

  $('#results').append(resultsStart);

  // If there are no search results, display a message to indicate this, but otherwise set up a table of the search results
  if (Object.keys(result).length === 0) {
    $('#results').append('<b>There are no grounding mesh panels at the specified location</b>');
  } else {
    for (const meshGroup of result) {
      const groupCount = `
        <tr>
          <td colspan = "3">Found ${meshGroup.componentUuids.length} meshes with part number <b>${partNumbersDictionary[meshGroup.partNumber]}</b></td>
        </tr>`;

      $('#results').append(groupCount);
    }

    $('#results').append('<br>');

    for (const meshGroup of result) {
      const groupTitle = `
        <tr>
          <td colspan = "3"><b>Part Number: ${partNumbersDictionary[meshGroup.partNumber]}</b></td>
        </tr>`;

      $('#results').append(groupTitle);

      const tableStart = `
        <tr>
          <th scope = 'col' width = '50%'>Mesh DUNE PID</th>
          <th scope = 'col' width = '25%'>Date at Location</th>
          <th scope = 'col' width = '25%'>Installed on APA</th>
        </tr>`;

      $('#results').append(tableStart);

      for (const i in meshGroup.componentUuids) {
        const boardText = `
          <tr>
            <td><a href = '/component/${meshGroup.componentUuids[i]}' target = '_blank'</a>${meshGroup.dunePids[i]}</td>
            <td>${meshGroup.receptionDates[i]}</td>
            <td>${meshGroup.installedOnAPA[i]}</td>
          </tr>`;

        $('#results').append(boardText);
      }

      $('#results').append('<br>');
    }
  }

  // Re-enable both confirmation buttons for the next search
  $('#confirmButton_location').prop('disabled', false);
  $('#confirmButton_partNumber').prop('disabled', false);
};


// Function to run for a successful search query by part number
function postSuccess_partNumber(result) {
  // Make sure that the page element where the results will be displayed is empty, and then enter an initial message to display
  $('#results').empty();

  const resultsStart = `
    <tr>
      <td colspan = "3">The following grounding mesh panels with part number <b>${$('#partNumberSelection option:selected').text()}</b> have been received.</td>
    </tr>
    <tr>
      <td colspan = "3">They are grouped by location, and then ordered by increasing DUNE PID within each group.
        <br>
        <hr>
      </td>
    </tr>`;

  $('#results').append(resultsStart);

  // If there are no search results, display a message to indicate this, but otherwise set up a table of the search results
  if (Object.keys(result).length === 0) {
    $('#results').append('<b>No grounding mesh panels of the given part number are at any location</b>');
  } else {
    for (const meshGroup of result) {
      const groupCount = `
        <tr>
          <td colspan = "3">Found ${meshGroup.componentUuids.length} meshes at <b>${dictionary_locations[meshGroup.receptionLocation]}</b></td>
        </tr>`;

      $('#results').append(groupCount);
    }

    $('#results').append('<br>');

    for (const meshGroup of result) {
      const groupTitle = `
        <tr>
          <td colspan = "3"><b>Location: ${dictionary_locations[meshGroup.receptionLocation]}</b></td>
        </tr>`;

      $('#results').append(groupTitle);

      const tableStart = `
        <tr>
          <th scope = 'col' width = '50%'>Mesh DUNE PID</th>
          <th scope = 'col' width = '25%'>Date at Location</th>
          <th scope = 'col' width = '25%'>Installed on APA</th>
        </tr>`;

      $('#results').append(tableStart);

      for (const i in meshGroup.componentUuids) {
        const boardText = `
          <tr>
            <td><a href = '/component/${meshGroup.componentUuids[i]}' target = '_blank'</a>${meshGroup.dunePids[i]}</td>
            <td>${meshGroup.receptionDates[i]}</td>
            <td>${meshGroup.installedOnAPA[i]}</td>
          </tr>`;

        $('#results').append(boardText);
      }

      $('#results').append('<br>');
    }
  }

  // Re-enable both confirmation buttons for the next search
  $('#confirmButton_location').prop('disabled', false);
  $('#confirmButton_partNumber').prop('disabled', false);
};


// Function to run for a failed search query of either scenario
function postFail(result, statusCode, statusMsg) {
  // If the query result contains a response message, display it, and if not, display any status message and error code instead
  if (result.responseText) {
    console.log('POSTFAIL: ', result.responseText);
  } else {
    console.log('POSTFAIL: ', `${statusMsg} (${statusCode})`);
  }

  // Re-enable both confirmation buttons for the next search
  $('#confirmButton_location').prop('disabled', false);
  $('#confirmButton_partNumber').prop('disabled', false);
};
