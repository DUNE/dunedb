// Declare variables to hold the user-specified search parameters
let boardKitLocation = null;

// Run a specific function when the page is loaded
window.addEventListener('load', renderSearchForms);


// Function to run when the page is loaded
async function renderSearchForms() {
  // Get and set the value of any search parameter that is changed
  $('#locationSelection').on('change', async function () {
    boardKitLocation = $('#locationSelection').val();
  });

  // When the confirmation button is pressed, perform the search using the appropriate jQuery 'ajax' call and the current values of the search parameters
  // Additionally, disable the button while the current search is being performed
  $('#confirmButton').on('click', function () {
    $('#confirmButton').prop('disabled', true);

    if (boardKitLocation) {
      $.ajax({
        contentType: 'application/json',
        method: 'GET',
        url: `/json/search/boardKitComponentsByLocation/${boardKitLocation}`,
        dataType: 'json',
        success: postSuccess,
      }).fail(postFail);
    }
  });
}


// Function to run for a successful search query
function postSuccess(result) {
  // Set up a dictionary containing the possible component type form ID and name [key, string] pairs
  const componentTypesDictionary = {
    CRBoard: 'CR Board',
    GBiasBoard: 'G-Bias Board',
    SHVBoard: 'SHV Board',
    CableHarness: 'Cable Harness',
  };

  // Make sure that the page element where the results will be displayed is empty, and then enter an initial message to display
  $('#results').empty();

  const resultsStart = `
    <tr>
      <td colspan = "2">The following populated board kit components are at <b>${$('#locationSelection option:selected').text()}</b>.</td>
    </tr>
    <tr>
      <td colspan = "2">They are grouped by component type, and then ordered by increasing DUNE PID within each group.
        <br>
        <hr>
      </td>
    </tr>`;

  $('#results').append(resultsStart);

  // If there are no search results, display a message to indicate this, but otherwise set up a table of the search results
  if (Object.keys(result).length === 0) {
    $('#results').append('<b>There are no populated board kit components at the specified location</b>');
  } else {
    for (const componentGroup of result) {
      const componentCount = `
        <tr>
          <td colspan = "2">Found ${componentGroup.componentUuids.length} components of type: <b>${componentTypesDictionary[componentGroup.type]}</b></td>
        </tr>`;

      $('#results').append(componentCount);
    }

    $('#results').append('<br>');

    for (const componentGroup of result) {
      const groupTitle = `
        <tr>
          <td colspan "2"><b>Component Type: ${componentTypesDictionary[componentGroup.type]}</b></td>
        </tr>`;

      $('#results').append(groupTitle);

      const tableStart = `
        <tr>
          <th scope = 'col' width = '50%'>DUNE PID</th>
          <th scope = 'col' width = '50%'>Date at Location</th>
        </tr>`;

      $('#results').append(tableStart);

      for (const i in componentGroup.componentUuids) {
        const componentText = `
          <tr>
            <td><a href = '/component/${componentGroup.componentUuids[i]}' target = '_blank'</a>${componentGroup.dunePids[i]}</td>
            <td>${componentGroup.receptionDates[i]}</td>
          </tr>`;

        $('#results').append(componentText);
      }

      $('#results').append('<br>');
    }
  }

  // Re-enable the confirmation button for the next search
  $('#confirmButton').prop('disabled', false);
};


// Function to run for a failed search query
function postFail(result, statusCode, statusMsg) {
  // If the query result contains a response message, display it, and if not, display any status message and error code instead
  if (result.responseText) {
    console.log('POSTFAIL: ', result.responseText);
  } else {
    console.log('POSTFAIL: ', `${statusMsg} (${statusCode})`);
  }

  // Re-enable the confirmation button for the next search
  $('#confirmButton').prop('disabled', false);
};
