// Declare variables to hold the user-specified search parameters
let componentType = null;
let disposition = 'any';
let nonConformStatus = 'any';
let componentUuid = null;

// Run a specific function when the page is loaded
window.addEventListener('load', renderSearchForms);


// Function to run when the page is loaded
async function renderSearchForms() {
  // Create a Formio form consisting of a component UUID input box, and render it in the page element called 'componentUuidSelection'
  const componentUuidSchema = {
    components: [{
      type: 'ComponentUUID',
      label: 'Component UUID',
      key: 'componentUuid',
      input: true,
      hideLabel: true,
    }],
  }

  const componentUuidForm = await Formio.createForm(document.getElementById('componentUuidSelection'), componentUuidSchema);

  // Get and set the value of any search parameter that is changed
  $('#componentTypeSelection').on('change', async function () {
    componentType = $('#componentTypeSelection').val();
  });

  $('#dispositionSelection').on('change', async function () {
    disposition = $('#dispositionSelection').val();
  });

  $('#statusSelection').on('change', async function () {
    nonConformStatus = $('#statusSelection').val();
  });

  // When the content of the UUID input box is changed, get the text string from the box
  // If the string is consistent with a valid UUID, store it in the global UUID variable
  componentUuidForm.on('change', function () {
    if (componentUuidForm.isValid()) {
      let inputString = componentUuidForm.submission.data.componentUuid;

      if (inputString && inputString.length === 36) componentUuid = inputString;
    }
  });

  // When the appropriate confirmation button is pressed, perform the search by component type using the appropriate jQuery 'ajax' call and the current values of the search parameters
  // Additionally, disable both confirmation buttons while the current search is being performed
  $('#confirmButton_type').on('click', function () {
    $('#confirmButton_type').prop('disabled', true);
    $('#confirmButton_uuid').prop('disabled', true);

    if (componentType) {
      $.ajax({
        contentType: 'application/json',
        method: 'GET',
        url: `/json/search/nonConformanceByComponentType/${componentType}/${disposition}/${nonConformStatus}`,
        dataType: 'json',
        success: postSuccess,
      }).fail(postFail);
    }
  });

  // When the appropriate confirmation button is pressed, perform the search by component UUID using the appropriate jQuery 'ajax' call and the current values of the search parameters
  // Additionally, disable both confirmation buttons while the current search is being performed
  $('#confirmButton_uuid').on('click', function () {
    $('#confirmButton_type').prop('disabled', true);
    $('#confirmButton_uuid').prop('disabled', true);

    if (componentUuid) {
      $.ajax({
        contentType: 'application/json',
        method: 'GET',
        url: `/json/search/nonConformanceByUUID/${componentUuid}`,
        dataType: 'json',
        success: postSuccess,
      }).fail(postFail);
    }
  });
}


// Function to run for a successful search query of either scenario
function postSuccess(result) {
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
        <th scope = 'col' width = '15%'>Component Type</th>
        <th scope = 'col' width = '20%'>Component Name</th>
        <th scope = 'col' width = '25%'>Non-Conformance Title / Action ID</th>
        <th scope = 'col' width = '15%'>Disposition</th>
        <th scope = 'col' width = '10%'>Status</th>
      </tr>`;

    $('#results').append(tableStart);

    for (const action of result) {
      const actionText = `
        <tr>
          <td>${componentTypesDictionary[action.componentType]}</td>
          <td><a href = '/component/${action.componentUuid}' target = '_blank'</a>${action.componentName}</td>
          <td><a href = '/action/${action.actionId}' target = '_blank'</a>${action.title ? action.title : action.actionId}</td>
          <td>${dispositionsDictionary[action.disposition]}</td>
          <td>${statusDictionary[action.status]}</td>
        </tr>`;

      $('#results').append(actionText);
    }
  }

  // Re-enable both confirmation buttons for the next search
  $('#confirmButton_type').prop('disabled', false);
  $('#confirmButton_uuid').prop('disabled', false);
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
  $('#confirmButton_type').prop('disabled', false);
  $('#confirmButton_uuid').prop('disabled', false);
};
