// Declare a variable to hold the (initially empty) user-specified non-conformance type
let nonConformance = null;


// Main function
$(function () {
  // When the selected non-conformance is changed, get the newly selected non-conformance from the corresponding page element
  // If the non-conformance is valid, perform the appropriate jQuery 'ajax' call to make the search
  $('#nonConformanceSelection').on('change', async function () {
    nonConformance = $('#nonConformanceSelection').val();

    if (nonConformance) {
      $.ajax({
        contentType: 'application/json',
        method: 'GET',
        url: `/json/search/apasByNonConformance/${nonConformance}`,
        dataType: 'json',
        success: postSuccess,
      }).fail(postFail);
    }
  });
});


// Set up a dictionary containing the activity in progress [key, string] pairs (taken directly from the 'APA Non-Conformance' action type form)
const activitiesDictionary = {
  preProduction: 'Pre-Production',
  xLayerWinding: 'X-Layer Winding',
  vLayerWinding: 'V-Layer Winding',
  uLayerWinding: 'U-Layer Winding',
  gLayerWinding: 'G-Layer Winding',
  postProduction: 'Post-Production',
  transport: 'Transport',
  coldTesting: 'Cold Testing',
  other: 'Other',
};


// Function to run for a successful search query by non-conformance
function postSuccess(result) {
  // Make sure that the page element where the results will be displayed is empty, and then enter an initial message to display
  $('#results').empty();

  const resultsStart = `
    <tr>
      <td colspan = "5">The following <b>${result.length}</b> assembled APAs have been inspected for conformance and found to have the non-conformance type: <b>${$('#nonConformanceSelection option:selected').text()}</b>.</td>
    </tr>
    <tr>
    <td colspan = "5"><br>
    </tr>`;

  $('#results').append(resultsStart);

  // If there are no search results, display a message to indicate this, but otherwise set up a table of the search results
  if (Object.keys(result).length === 0) {
    $('#results').append('<b>There are no assembled APAs with the specified non-conformance type</b>');
  } else {
    const tableStart = `
      <tr>
        <th scope = 'col' width = '23%'>APA Name (DUNE PID)</th>
        <th scope = 'col' width = '18%'>Action Record</th>
        <th scope = 'col' width = '41%'>Non-Conformance Description</th>
        <th scope = 'col' width = '15%'>Activity in Progress</th>
        <th scope = 'col' width = '3%'>ELog</th>
      </tr>`;

    $('#results').append(tableStart);

    for (const action of result) {
      console.log(action);
      const actionText = `
        <tr>
          <td><a href = '/component/${action.componentUuid}' target = '_blank'</a>${action.componentName}</td>
          <td><a href = '/action/${action.actionId}' target = '_blank'</a>${action.actionId}</td>
          <td>${action.data.nonConformanceDescription}</td>
          <td>${activitiesDictionary[action.data.activityInProgressWhenFound]}</td>
          <td><a href = '${action.data.eLogUrl}' target = '_blank'</a>Link</td>
        </tr>`;

      $('#results').append(actionText);
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
