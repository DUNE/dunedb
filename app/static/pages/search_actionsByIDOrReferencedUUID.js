// Declare variables to hold the user-specified search parameters
let componentUuid = null;
let actionType = null;

// Run a specific function when the page is loaded
window.addEventListener('load', renderSearchForms);


// Function to run when the page is loaded
async function renderSearchForms() {
  // Create a Formio form consisting of an action ID input box, and render it in the page element called 'actionidform'
  const actionIdSchema = {
    components: [{
      type: 'ActionID',
      label: 'Action ID',
      key: 'actionId',
      validate: { 'required': true, },
      input: true,
    }],
  }

  const actionIdForm = await Formio.createForm(document.getElementById('actionidform'), actionIdSchema);

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

  // When the content of the action ID input box is changed, get the text string from the box
  // If the string is consistent with a valid ID, create the URL for the corresponding action's information page, and then go to that page
  actionIdForm.on('change', function () {
    if (actionIdForm.isValid()) {
      const actionId = actionIdForm.submission.data.actionId;

      if (actionId && actionId.length === 24) window.location.href = `/action/${actionId}`;
    }
  });

  // When the content of the UUID input box is changed, get the text string from the box
  // If the string is consistent with a valid UUID, and an action type has been selected, perform the search
  componentUuidForm.on('change', function () {
    if (componentUuidForm.isValid()) {
      componentUuid = componentUuidForm.submission.data.componentUuid;

      if (componentUuid && componentUuid.length === 36 && actionType !== '') performSearch();
    }
  });

  // Get and set the value of the action type search parameter as it is changed
  // If a valid UUID has been entered and an action type has been selected, perform the search
  $('#actionTypeSelection').on('change', async function () {
    actionType = $('#actionTypeSelection').val();

    if (componentUuid && componentUuid.length === 36 && actionType !== '') performSearch();
  });
}


// Function to perform the search using the appropriate jQuery 'ajax' call and the current values of the search parameters
function performSearch() {
  $.ajax({
    contentType: 'application/json',
    method: 'GET',
    url: `/json/search/actionsByReferencedUUID/${componentUuid}/${actionType}`,
    dataType: 'json',
    success: postSuccess,
  }).fail(postFail);
}


// Function to run for a successful search query
function postSuccess(result) {
  // Make sure that the page element where the results will be displayed is empty, and then enter an initial message to display
  $('#results').empty();

  const resultsStart = `
    <tr>
      <td colspan = "2">The following <b>${$('#actionTypeSelection option:selected').text()}</b> actions reference the specified component UUID.</td>
    </tr>
    <tr>
      <td colspan = "5"><br></td>
    </tr>`;

  $('#results').append(resultsStart);

  // If there are no search results, display a message to indicate this, but otherwise set up a table of the search results
  if (result.length === 0) {
    $('#results').append('<b>The specified component UUID is not referenced by any existing actions of this type.</b>');
  } else {
    const tableStart = `
        <tr>
          <th scope = 'col' width = '50%'>Action</th>
          <th scope = 'col' width = '50%'>Performed On Component</th>
        </tr>`;

    $('#results').append(tableStart);

    for (const action of result) {
      const actionText = `
          <tr>
            <td><a href = '/action/${action.actionId}' target = '_blank'</a>${action.typeFormName}</td>
            <td><a href = '/component/${action.componentUuid}' target = '_blank'</a>${action.componentName}</td>
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
