// Declare a variable to hold the (initially empty) user-entered component UUID string
let inputString = null;

// Run a specific function when the page is loaded
window.addEventListener('load', renderUUIDForm);


// Function to run when the page is loaded
async function renderUUIDForm() {
  // Create a Formio form consisting of a component UUID input box, and render it in the page element called 'componentuuidform'
  const componentUuidSchema = {
    components: [{
      type: 'ComponentUUID',
      label: 'Component UUID',
      key: 'componentUuid',
      validate: { 'required': true, },
      input: true,
    }],
  }

  const componentUuidForm = await Formio.createForm(document.getElementById('componentuuidform'), componentUuidSchema);

  // When the content of the UUID input box is changed, get the text string from the box
  // If the string is consistent with a valid UUID, perform the appropriate jQuery 'ajax' call to make the search
  componentUuidForm.on('change', function () {
    if (componentUuidForm.isValid()) {
      inputString = componentUuidForm.submission.data.componentUuid;

      if (inputString && inputString.length === 36) {
        $.ajax({
          contentType: 'application/json',
          method: 'GET',
          url: `/json/search/tensionMeasurementsByUUID/${inputString}`,
          dataType: 'json',
          success: postSuccess,
        }).fail(postFail);
      }
    }
  });
}


// Function to run for a successful search query
function postSuccess(result) {
  // Make sure that the page element where the results will be displayed is empty, and then enter an initial message to display
  $('#results').empty();

  const resultsStart = `
    <tr>
      <td colspan = "4">The following ${result.length} tension measurement actions have been performed on the specified component.</td>
    </tr>
    <tr>
      <td colspan = "4"><br></td>
    </tr>`;

  $('#results').append(resultsStart);

  // If there are no search results, display a message to indicate this, but otherwise set up a table of the search results
  if (result.length === 0) {
    $('#messages').append('<b>No tension measurement actions have been performed on the specified component.</b>');
  } else {
    const tableStart = `
        <tr>
          <th scope = 'col' width = '30%'>Action</th>
          <th scope = 'col' width = '15%'>Wire Layer</th>
          <th scope = 'col' width = '30%'>Measurement Location</th>
          <th scope = 'col' width = '20%'>Comments</th>

        </tr>`;

    $('#results').append(tableStart);

    for (const action of result) {
      const actionText = `
          <tr>
            <td><a href = '/action/${action.actionId}' target = '_blank'</a>${action.actionId}</td>
            <td>${action.apaLayer.toUpperCase()}</td>
            <td>${(action.location) ? (dictionary_locations[action.location]) : '[unknown]'}</td>
            <td>${action.comments}</td>
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
