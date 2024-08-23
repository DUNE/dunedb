// Declare variables to hold the (initially empty) user-specified assembled APA production location and number, and last completed assembly step
let apaLocation = null;
let apaNumber = null;
let assemblyStep = null;


// Main function
$(function () {
  // When the selected APA production location is changed, get the newly selected location from the corresponding page element
  // If both user-specified search criteria are valid, then perform the search
  $('#locationSelection').on('change', async function () {
    apaLocation = $('#locationSelection').val();

    if (apaLocation && apaNumber) performSearch_locationAndNumber();
  });

  // When the entered APA production number is changed and the 'Enter' key is pressed, get the newly entered number from the corresponding page element
  // If both user-specified search criteria are valid, then perform the search
  document.getElementById('numberSelection').addEventListener('keyup', function (e) {
    if (e.key === 'Enter') {
      apaNumber = $('#numberSelection').val();

      if (apaLocation && apaNumber) performSearch_locationAndNumber();
    }
  });

  // When the selected assembly step is changed, get the newly selected assembly step from the corresponding page element
  // If the assembly step is valid, perform the appropriate jQuery 'ajax' call to make the search by last completed assembly step
  $('#assemblyStepSelection').on('change', async function () {
    assemblyStep = $('#assemblyStepSelection').val();

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
});


// Function to perform the appropriate jQuery 'ajax' call to make the search by production location and number
function performSearch_locationAndNumber() {
  $.ajax({
    contentType: 'application/json',
    method: 'GET',
    url: `/json/search/apasByProductionLocationAndNumber/${apaLocation}/${apaNumber}`,
    dataType: 'json',
    success: postSuccess_locationAndNumber,
  }).fail(postFail);
}


// Function to run for a successful search query by production location and number
function postSuccess_locationAndNumber(result) {
  // Make sure that all page elements where information messages or search results will be displayed are empty
  $('#messages').empty();
  $('#results1').empty();
  $('#results2').empty();

  // If there are no search results, display a message to indicate this
  // Similarly, if there is more than one search result (i.e. more than one assembled APA matches the provided record details), also display a message
  // Otherwise (i.e. there is exactly one assembled APA in the search results), redirect the user to the page for viewing the assembled APA component record
  if (result.length === 0) {
    $('#messages').append('<b>There is no assembled APA matching the specified record details.</b>');
  } else if (result.length > 1) {
    const output = `
      <b>The specified record details match <u>multiple</u> assembled APAs.</b>
      <br>This should not happen, since these two pieces of information should uniquely identify a single APA.
      <br>Please bring this to the attention of one of the database development team, indicating the APA record details that you specified on the left.`;

    $('#messages').append(output);
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
}


// Function to run for a failed search query of either scenario
function postFail(result, statusCode, statusMsg) {
  // If the query result contains a response message, display it, and if not, display any status message and error code instead
  if (result.responseText) {
    console.log('POSTFAIL: ', result.responseText);
  } else {
    console.log('POSTFAIL: ', `${statusMsg} (${statusCode})`);
  }
};
