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
    $('#results1').empty().append('<b>Working ...</b>');

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
    $('#summary1').empty().append('<b>Working ...</b>');
    $('#results1').empty();

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

  // Make sure that the page elements where the results will be displayed are all empty
  $('#summary1').empty();
  $('#results1').empty();

  // If there are no search results, display a message to indicate this
  // Otherwise, set up an initial message to display, and a table of the search results
  if (Object.keys(result).length === 0) {
    $('#summary1').append('<b>There are no non-conformance actions matching the specified parameters</b>');
  } else {
    const tableStart = `
      <tr>
        <th style = 'width: 20%'>Component</th>
        <th style = 'width: 25%'>NC Type</th>
        <th style = 'width: 35%'>NC Title</th>
        <th style = 'width: 12%'>Disposition</th>
        <th style = 'width: 8%'>Status</th>
      </tr>`;

    $('#results1').append(tableStart);

    for (const action of result) {
      const actionText = `
        <tr>
          <td><a href = '/component/${action.componentUuid}' target = '_blank'</a>${action.componentName}</td>
          <td>${componentTypesDictionary[action.componentType]} - ${action.nonConfType}</td>
          <td><a href = '/action/${action.actionId}' target = '_blank'</a>${action.title ? action.title : action.actionId}</td>
          <td>${dispositionsDictionary[action.disposition]}</td>
          <td>${statusDictionary[action.status]}</td>
        </tr>`;

      $('#results1').append(actionText);
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
