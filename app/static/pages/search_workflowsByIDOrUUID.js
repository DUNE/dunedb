// Declare a variable to hold the user-specified search parameters
let componentUuid = null;

// Run a specific function when the page is loaded
window.addEventListener('load', renderSearchForms);


// Function to run when the page is loaded
async function renderSearchForms() {
  // Create a Formio form consisting of a workflow ID input box, and render it in the page element called 'workflowidform'
  const workflowIdSchema = {
    components: [{
      type: 'WorkflowID',
      label: 'Workflow ID',
      key: 'workflowId',
      validate: { 'required': true, },
      input: true,
    }],
  }

  const workflowIdForm = await Formio.createForm(document.getElementById('workflowidform'), workflowIdSchema);

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

  // When the content of the workflow ID input box is changed, get the text string from the box
  // If the string is consistent with a valid ID, create the URL for the corresponding workflow's information page, and then go to that page
  workflowIdForm.on('change', function () {
    if (workflowIdForm.isValid()) {
      const workflowId = workflowIdForm.submission.data.workflowId;

      if (workflowId && workflowId.length === 24) window.location.href = `/workflow/${workflowId}`;
    }
  });

  // When the content of the UUID input box is changed, get the text string from the box
  // If the string is consistent with a valid UUID, perform the search using the appropriate jQuery 'ajax' call and the current values of the search parameters
  componentUuidForm.on('change', function () {
    if (componentUuidForm.isValid()) {
      componentUuid = componentUuidForm.submission.data.componentUuid;

      if (componentUuid && componentUuid.length === 36) {
        $.ajax({
          contentType: 'application/json',
          method: 'GET',
          url: `/json/search/workflowsByUUID/${componentUuid}`,
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
  // Similarly, if there is more than one search result (i.e. the specified component is involved in multiple workflows), also display a message
  // Otherwise (i.e. there is exactly one workflow in the search results), redirect the user to the page for viewing the workflow record
  if (result.length === 0) {
    $('#messages').append('<b>The specified component is not part of an existing workflow.</b>');
  } else if (result.length > 1) {
    const output = `
      <b>The specified component is part of <u>multiple</u> workflows.</b>
      <br>This should not happen, since each workflow should be uniquely related to a single component.
      <br>Please bring this to the attention of one of the database development team, indicating the component UUID that you specified above.`;

    $('#messages').append(output);
  } else {
    window.location.href = `/workflow/${result[0].workflowId}`;
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
