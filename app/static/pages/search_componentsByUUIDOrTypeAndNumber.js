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
      validate: { 'required': true, },
      input: true,
    }],
  }

  const componentUuidForm = await Formio.createForm(document.getElementById('componentuuidform'), componentUuidSchema);

  // If a valid UUID is entered, create the URL for the corresponding component's information page, and then go to that page
  componentUuidForm.on('change', function () {
    if (componentUuidForm.isValid()) {
      const componentUuid = componentUuidForm.submission.data.componentUuid;

      if (componentUuid && componentUuid.length === 36) window.location.href = `/component/${componentUuid}`;
    }
  });

  // When the entered type record number is changed and the 'Enter' key is pressed, get the newly entered type record number from the corresponding page element
  // If the selected component type and order number are both valid, perform the appropriate jQuery 'ajax' call to make the search
  document.getElementById('typeRecordNumberSelection').addEventListener('keyup', function (e) {
    if (e.key === 'Enter') {
      componentType = $('#componentTypeSelection').val();
      typeRecordNumber = $('#typeRecordNumberSelection').val();

      if ((componentType !== '') && (typeRecordNumber)) {
        $.ajax({
          contentType: 'application/json',
          method: 'GET',
          url: `/json/search/componentsByTypeAndNumber/${componentType}/${typeRecordNumber}`,
          dataType: 'json',
          success: postSuccess,
        }).fail(postFail);
      }
    }
  });
}


// Function to run for a successful search query
function postSuccess(result) {
  // Make sure that the page element where any information messages will be displayed is empty
  $('#messages').empty();

  // If there are no search results, display a message to indicate this
  // Similarly, if there is more than one search result (i.e. the specified type record number matches multiple components of the specified type), also display a message
  // Otherwise (i.e. there is exactly one component in the search results), redirect the user to the page for viewing the component record
  if (result.length === 0) {
    $('#messages').append('<b>The specified type record number does not match an existing component of the specified type.</b>');
  } else if (result.length > 1) {
    const output = `
      <b>The specified type record number matches <u>multiple</u> components of the specified type.</b>
      <br>This should not happen, since each component of a single type should have a unique type record number.
      <br>Please bring this to the attention of one of the database development team, indicating the component type and type record number that you specified above.`;

    $('#messages').append(output);
  } else {
    window.location.href = `/component/${result[0].componentUuid}`;
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
