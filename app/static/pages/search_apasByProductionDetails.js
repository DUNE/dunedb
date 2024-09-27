// Declare variables to hold the user-specified search parameters
let apaLocation = null;
let apaNumber = null;
let assemblyStep = null;

// Run a specific function when the page is loaded
window.addEventListener('load', renderSearchForms);


// Function to run when the page is loaded
async function renderSearchForms() {
  // Get and set the value of any search parameter that is changed
  $('#locationSelection').on('change', async function () {
    apaLocation = $('#locationSelection').val();
  });

  $('#numberSelection').on('change', async function () {
    apaNumber = $('#numberSelection').val();
  });

  $('#assemblyStepSelection').on('change', async function () {
    assemblyStep = $('#assemblyStepSelection').val();
  });

  // When the appropriate confirmation button is pressed, perform the search by location and number using the appropriate jQuery 'ajax' call and the current values of the search parameters
  // Additionally, disable both confirmation buttons while the current search is being performed
  $('#confirmButton_locationNumber').on('click', function () {
    $('#confirmButton_locationNumber').prop('disabled', true);
    $('#confirmButton_assemblyStep').prop('disabled', true);

    if (apaLocation && apaNumber) {
      $.ajax({
        contentType: 'application/json',
        method: 'GET',
        url: `/json/search/apasByProductionLocationAndNumber/${apaLocation}/${apaNumber}`,
        dataType: 'json',
        success: postSuccess_locationAndNumber,
      }).fail(postFail);
    }
  });

  // When the appropriate confirmation button is pressed, perform the search by assembly step using the appropriate jQuery 'ajax' call and the current values of the search parameters
  // Additionally, disable both confirmation buttons while the current search is being performed
  $('#confirmButton_assemblyStep').on('click', function () {
    $('#confirmButton_locationNumber').prop('disabled', true);
    $('#confirmButton_assemblyStep').prop('disabled', true);

    if (assemblyStep) {
      $.ajax({
        contentType: 'application/json',
        method: 'GET',
        url: `/json/search/apasByLastCompletedAssemblyStep/${assemblyStep}`,
        dataType: 'json',
        success: postSuccess_assemblyStep,
      }).fail(postFail);
    }
  });
}


// Function to run for a successful search query by production location and number
function postSuccess_locationAndNumber(result) {
  // Make sure that all page elements where information messages or search results will be displayed are empty
  $('#messages').empty();
  $('#results1').empty();
  $('#results2').empty();

  // If there are no search results, display a message to indicate this, and then re-enable both confirmation buttons for the next search
  // Similarly, if there is more than one search result (i.e. more than one assembled APA matches the provided record details), also display a message and re-enable the buttons
  // Otherwise (i.e. there is exactly one assembled APA in the search results), redirect the user to the page for viewing the assembled APA component record
  if (result.length === 0) {
    $('#messages').append('<b>There is no assembled APA matching the specified record details.</b>');
    $('#confirmButton_locationNumber').prop('disabled', false);
    $('#confirmButton_assemblyStep').prop('disabled', false);
  } else if (result.length > 1) {
    const output = `
      <b>The specified record details match <u>multiple</u> assembled APAs.</b>
      <br>This should not happen, since these two pieces of information should uniquely identify a single APA.
      <br>Please bring this to the attention of one of the database development team, indicating the APA record details that you specified on the left.`;

    $('#messages').append(output);
    $('#confirmButton_locationNumber').prop('disabled', false);
    $('#confirmButton_assemblyStep').prop('disabled', false);
  } else {
    window.location.href = `/component/${result[0].componentUuid}`;
  }
};


// Function to run for a successful search query by last completed assembly step
function postSuccess_assemblyStep(result) {
  // Make sure that all page elements where information messages or search results will be displayed are empty
  $('#messages').empty();
  $('#results1').empty();
  $('#results2').empty();

  // Display the information about APAs that have had the specified assembly step completed
  let resultsStart = `
  <tr>
    <td colspan = "3">The specified assembly step has been completed for <b>${result[0].length} APAs</b>
      <br>
      <hr>
    </td>
  </tr>`;

  $('#results1').append(resultsStart);

  let tableStart = `
    <tr>
      <th scope = 'col' width = '30%'>APA Name</th>
      <th scope = 'col' width = '35%'>Component Info</th>
      <th scope = 'col' width = '35%'>Assembly Workflow</th>
    </tr>`;

  $('#results1').append(tableStart);

  for (const apa of result[0]) {
    const apaText = `
      <tr>
        <td>${apa.componentName}</td>
        <td><a href = '/component/${apa.componentUuid}' target = '_blank'</a>[link]</td>
        <td><a href = '/workflow/${apa.workflowId}' target = '_blank'</a>[link]</td>
      </tr>`;

    $('#results1').append(apaText);
  }

  // Display the information about APAs that have not yet had the specified assembly step completed
  resultsStart = `
  <tr>
    <td colspan = "3">The specified assembly step has not yet been completed for <b>${result[1].length} APAs</b>
      <br>
      <hr>
    </td>
  </tr>`;

  $('#results2').append(resultsStart);
  $('#results2').append(tableStart);

  for (const apa of result[1]) {
    const apaText = `
      <tr>
        <td>${apa.componentName}</td>
        <td><a href = '/component/${apa.componentUuid}' target = '_blank'</a>[link]</td>
        <td><a href = '/workflow/${apa.workflowId}' target = '_blank'</a>[link]</td>
      </tr>`;

    $('#results2').append(apaText);
  }

  // Re-enable both confirmation buttons for the next search
  $('#confirmButton_locationNumber').prop('disabled', false);
  $('#confirmButton_assemblyStep').prop('disabled', false);
}


// Function to run for a failed search query of either scenario
function postFail(result, statusCode, statusMsg) {
  // If the query result contains a response message, display it, and if not, display any status message and error code instead
  if (result.responseText) {
    console.log('POSTFAIL: ', result.responseText);
  } else {
    console.log('POSTFAIL: ', `${statusMsg} (${statusCode})`);
  }

  // Re-enable both confirmation buttons for the next search
  $('#confirmButton_locationNumber').prop('disabled', false);
  $('#confirmButton_assemblyStep').prop('disabled', false);
};
