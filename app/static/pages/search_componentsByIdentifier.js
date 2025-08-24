// Declare variables to hold the user-specified search parameters
let componentType = null;
let typeRecordNumber = null;
let dunePID = null;

// Run a specific function when the page is loaded
window.addEventListener('load', renderSearchForms);


// Function to run when the page is loaded
async function renderSearchForms() {
  // Create a Formio form consisting of a component UUID input box, and render it in the page element called 'componentuuidform'
  const componentUuidSchema = {
    components: [{
      type: 'ComponentUUID',
      label: 'Component UUID',
      key: 'componentUuid',
      input: true,
      hideLabel: true,
    }],
  }

  const componentUuidForm = await Formio.createForm(document.getElementById('componentuuidform'), componentUuidSchema);

  // When the content of the component UUID input box is changed, get the text string from the box
  // If the string is consistent with a valid UUID, create the URL for the corresponding component's information page, and then go to that page
  componentUuidForm.on('change', function () {
    if (componentUuidForm.isValid()) {
      const componentUuid = componentUuidForm.submission.data.componentUuid;

      if (componentUuid && componentUuid.length === 36) window.location.href = `/component/${componentUuid}`;
    }
  });

  // Get and set the value of any search parameter that is changed
  $('#componentTypeSelection').on('change', async function () {
    componentType = $('#componentTypeSelection').val();
  });

  $('#typeRecordNumberSelection').on('change', async function () {
    typeRecordNumber = $('#typeRecordNumberSelection').val();
  });

  $('#dunePIDSelection').on('change', async function () {
    dunePID = $('#dunePIDSelection').val();
  });

  // When the appropriate confirmation button is pressed, perform the search by component type and type record number using the appropriate jQuery 'ajax' call and the current values of the search parameters
  // Additionally, disable both confirmation buttons while the current search is being performed
  $('#confirmButton_typeAndNumber').on('click', function () {
    $('#confirmButton_typeAndNumber').prop('disabled', true);
    $('#confirmButton_dunePID').prop('disabled', true);
    $('#messages').empty().append('<b>Working ...</b>');

    if (componentType && typeRecordNumber) {
      $.ajax({
        contentType: 'application/json',
        method: 'GET',
        url: `/json/search/componentsByTypeAndNumber/${componentType}/${typeRecordNumber}`,
        dataType: 'json',
        success: postSuccess,
      }).fail(postFail);
    }
  })

  // When the appropriate confirmation button is pressed, perform the search by DUNE PID using the appropriate jQuery 'ajax' call and the current values of the search parameters
  // Additionally, disable both confirmation buttons while the current search is being performed
  $('#confirmButton_dunePID').on('click', function () {
    $('#confirmButton_typeAndNumber').prop('disabled', true);
    $('#confirmButton_dunePID').prop('disabled', true);
    $('#messages').empty().append('<b>Working ...</b>');

    if (dunePID) {
      $.ajax({
        contentType: 'application/json',
        method: 'GET',
        url: `/json/search/componentsByDUNEPID/${dunePID}`,
        dataType: 'json',
        success: postSuccess,
      }).fail(postFail);
    }
  })
}


// Function to run for a successful search query of either scenario
function postSuccess(result) {
  // Make sure that the page element where any information messages will be displayed is empty
  $('#messages').empty();

  // If there are no search results, display a message to indicate this, and then re-enable both confirmation buttons for the next search
  // Similarly, if there is more than one search result and the component type is NOT one of those that has non-unique type record numbers, also display a message and re-enable both buttons
  // If there is more than one search result and the component type is one of those that has non-unique type record numbers ...
  // ... display some information about all results so that the user can choose which one to explore further
  // Otherwise (i.e. if there is exactly one component in the search results), redirect the user to the page for viewing the component record
  if (result.length === 0) {
    $('#messages').append('<b>The specified search parameters do not match an existing component.</b>');
    $('#confirmButton_dunePID').prop('disabled', false);
    $('#confirmButton_typeAndNumber').prop('disabled', false);
  } else if (result.length > 1) {
    if (['APAFrame', 'APAShippingFrame', 'AssembledAPA', 'CableHarness', 'DWA', 'DWAPDB'].includes(componentType)) {
      const output = `
        <b>The specified search parameters match <u>multiple</u> components:</b><br><br>`;

      $('#messages').append(output);

      for (const component of result) {
        const componentText = `<a href = '/component/${component.componentUuid}' target = '_blank'</a>${component.componentName}<br>`;
        $('#messages').append(componentText);
      }
    } else {
      const output = `
        <b>The specified search parameters match <u>multiple</u> components.</b>
        <br>This should not happen, since each component should have a unique DUNE PID, and each component of the selected type should have a unique type record number.
        <br>Please bring this to the attention of one of the DB Admins, indicating the search parameters that you specified above.`;

      $('#messages').append(output);
    }

    $('#confirmButton_dunePID').prop('disabled', false);
    $('#confirmButton_typeAndNumber').prop('disabled', false);
  } else {
    window.location.href = `/component/${result[0].componentUuid}`;
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

  // Re-enable both confirmation buttons for the next search
  $('#confirmButton_dunePID').prop('disabled', false);
  $('#confirmButton_typeAndNumber').prop('disabled', false);
};
