// Declare variables to hold the (initially empty) user-specified non-conformance details
let componentType = '';
let disposition = '';
let nonConformStatus = '';


// Run a specific function when the page is loaded
window.addEventListener('load', renderSearchForms);


// Function to run when the page is loaded
async function renderSearchForms() {
  // When the selected component type is changed, get the newly selected type
  // If the type has a non-empty value (i.e. an option has actually been selected), perform the search using the current values of the non-conformance details variables
  $('#componentTypeSelection').on('change', async function () {
    componentType = $('#componentTypeSelection').val();

    if (componentType !== '') performSearch();
  });

  // When the selected disposition is changed, get the newly selected disposition if it has a value, or otherwise reset the string
  // Then perform the search using the current values of the non-conformance details variables
  $('#dispositionSelection').on('change', async function () {
    if ($('#dispositionSelection').val()) {
      disposition = $('#dispositionSelection').val();
    } else {
      disposition = '';
    }

    performSearch();
  });

  // When the selected status is changed, get the newly selected status if it has a value, or otherwise reset the string
  // Then perform the search using the current values of the non-conformance details variables
  $('#statusSelection').on('change', async function () {
    if ($('#statusSelection').val()) {
      nonConformStatus = $('#statusSelection').val();
    } else {
      nonConformStatus = '';
    }

    performSearch();
  });
}


// Function to perform the appropriate jQuery 'ajax' call to make the search
function performSearch() {
  $.ajax({
    contentType: 'application/json',
    method: 'GET',
    url: `/json/search/nonConformanceByRecordDetails?componentType=${componentType}&disposition=${disposition}&status=${nonConformStatus}`,
    dataType: 'json',
    success: postSuccess,
  }).fail(postFail);
}


// Set up dictionaries containing the component type, disposition and status [key, string] pairs (all taken directly from the 'APA Non-Conformance' action type form)
const componentTypesDictionary = {
  assembledApa: 'Assembled APA',
  apaFrame: 'APA Frame',
  groundingMeshPanel: 'Grounding Mesh Panel',
};

const dispositionsDictionary = {
  useAsIs: 'Use As Is',
  repair: 'Repair',
  rework: 'Rework',
  returnToSupplier: 'Return to Supplier',
  rejectRePurpose: 'Reject/Re-purpose',
  scrap: 'Scrap',
};

const statusDictionary = {
  open: 'Open',
  closed: 'Closed',
};


// Function to run for a successful search query by non-conformance
function postSuccess(result) {
  // Make sure that the page element where the results will be displayed is empty, and then enter an initial message to display
  $('#results').empty();

  const resultsStart = `
    <tr>
      <td colspan = "5">The following ${result.length} non-conformance actions have been found matching the specified search criteria.</td>
    </tr>
    <tr>
      <td colspan = "5"><br></td>
    </tr>`;

  $('#results').append(resultsStart);

  // If there are no search results, display a message to indicate this, but otherwise set up a table of the search results
  if (Object.keys(result).length === 0) {
    $('#results').append('<b>Found no matching non-conformance actions</b>');
  } else {
    const tableStart = `
      <tr>
        <th scope = 'col' width = '12%'>Component Type</th>
        <th scope = 'col' width = '20%'>Component UUID</th>
        <th scope = 'col' width = '18%'>Action ID</th>
        <th scope = 'col' width = '15%'>Disposition</th>
        <th scope = 'col' width = '5%'>Status</th>
      </tr>`;

    $('#results').append(tableStart);

    for (const action of result) {
      console.log(action);
      const actionText = `
        <tr>
          <td>${componentTypesDictionary[action.componentType]}</td>
          <td><a href = '/component/${action.componentUuid}' target = '_blank'</a>${action.componentUuid}</td>
          <td><a href = '/action/${action.actionId}' target = '_blank'</a>${action.actionId}</td>
          <td>${dispositionsDictionary[action.disposition]}</td>
          <td>${statusDictionary[action.status]}</td>
        </tr>`;

      $('#results').append(actionText);
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
