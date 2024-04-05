// Declare variables to hold the (initially empty) user-specified board location
let receptionLocation = null;


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
        url: `/json/search/boardKitComponentsByLocation/${receptionLocation}`,
        dataType: 'json',
        success: postSuccess,
      }).fail(postFail);
    }
  });
});


// Set up a dictionary containing the possible component type form ID and name [key, string] pairs
const componentTypesDictionary = {
  CRBoard: 'CR Board',
  GBiasBoard: 'G-Bias Board',
  SHVBoard: 'SHV Board',
  CableHarness: 'Cable Harness',
};


// Function to run for a successful search query
function postSuccess(result) {
  // Make sure that the page element where the results will be displayed is empty, and then enter an initial message to display
  $('#results').empty();

  const resultsStart = `
    <tr>
      <td colspan = "3">The following populated board kit components have been received at <b>${$('#locationSelection option:selected').text()}</b>.</td>
    </tr>
    <tr>
      <td colspan = "3">They are grouped by component type, and then ordered by last DB record edit (most recent at the top).
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
          <td colspan = "3">Found ${componentGroup.componentUuids.length} components of type: <b>${componentTypesDictionary[componentGroup.type]}</b></td>
        </tr>`;

      $('#results').append(componentCount);
    }

    $('#results').append('<br>');

    for (const componentGroup of result) {
      const groupTitle = `<b>Component Type: ${componentTypesDictionary[componentGroup.type]}</b>`;

      $('#results').append(groupTitle);

      const tableStart = `
        <tr>
          <th scope = 'col' width = '40%'>Component UUID</th>
          <th scope = 'col' width = '40%'>DUNE PID</th>
          <th scope = 'col' width = '20%'>Received On:</th>
        </tr>`;

      $('#results').append(tableStart);

      for (const i in componentGroup.componentUuids) {
        const componentText = `
          <tr>
            <td><a href = '/component/${componentGroup.componentUuids[i]}' target = '_blank'</a>${componentGroup.componentUuids[i]}</td>
            <td>${componentGroup.dunePids[i]}</td>
            <td>${componentGroup.receptionDates[i]}</td>
          </tr>`;

        $('#results').append(componentText);
      }

      $('#results').append('<br>');
    }
  }
};


// Function to run for a failed search query
function postFail(result, statusCode, statusMsg) {
  // If the query result contains a response message, display it, and if not, display any status message and error code instead
  if (result.responseText) {
    console.log('POSTFAIL: ', result.responseText);
  } else {
    console.log('POSTFAIL: ', `${statusMsg} (${statusCode})`);
  }
};
