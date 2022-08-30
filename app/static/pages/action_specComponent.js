// Declare a variable to hold the completed type form that will eventually be submitted to the database
let typeForm;


// Run a specified function when the page is loaded
window.addEventListener('load', onPageLoad);


// Function to run when the page is loaded
async function onPageLoad() {
  // Set up a new type form based on the schema of the action type form
  let schema = actionTypeForm.schema;

  // Add a 'Submit' button to the type form (this is temporary, only in the scope of this script)
  schema.components.push({
    type: 'button',
    theme: 'btn btn-success',
    label: 'Submit Action Record',
    key: 'submit',
    disableOnInvalid: true,
    input: true,
    tableView: false,
  });

  // Render the type form in the page element called 'typeform'
  typeForm = await Formio.createForm(document.getElementById('typeform'), schema, {
    readOnly: false,
    buttonSettings: {
      showCancel: false,
      showSubmit: false,
    }
  });

  // Populate the type form with the contents of the action itself
  // If we are performing a new action, this won't make any changes
  // If we are editing an existing action, this is where the existing information is filled in
  typeForm.submission = Object.assign(typeForm.submission, action);

  // When the populated type form is submitted (via clicking on the 'Submit' button), run the appropriate event handler callback function
  // This is a Formio event handler, NOT a jQuery one (the code syntax '.on' is identical, but the input argument and callback structure are different)
  typeForm.on('submit', function (submission) {
    // At this point, the 'submission' object contains ONLY the information that has been entered into the type form by the user (the 'data' field)
    // Now add all other required information from the passed variables to the 'submission' object
    submission.typeFormId = actionTypeForm.formId;
    submission.typeFormName = actionTypeForm.formName;
    submission.componentUuid = componentUuid;

    // If the action originates from a workflow (i.e. a non-empty workflow ID has been provided), save the workflow ID into the 'submission' object
    if (!(workflowId === '')) submission.workflowId = workflowId;

    // Once all additions and changes to the 'submission' object have been completed, submit it to the database
    SubmitData(submission);
  });
}


// Function to submit the completed 'submission' object to the database
function SubmitData(submission) {
  // Submit the 'submission' object via a jQuery 'ajax' call, with the success and failure functions as defined below
  $.ajax({
    contentType: 'application/json',
    method: 'post',
    url: '/json/action',
    data: JSON.stringify(submission),
    dataType: 'json',
    success: postSuccess,
  }).fail(postFail);


  // Function to run for a successful submission
  function postSuccess(result) {
    // If the submission result contains an error (even with a successful submission), display it along with the appropriate Formio alert type
    if (result.error) {
      typeForm.setAlert('warning', result.error);
      typeForm.emit('error', result.error);
    }

    // Display a 'submission complete' message
    typeForm.emit('submitDone');

    // Redirect the user to the appropriate post-submission page ('result' is the action's action ID)
    // If the action is a 'Board Reception' type, we must first redirect to update the board information (and further redirection will be handled from there)
    // If not, then we can simply proceed with standard post-submission redirection:
    //   - if the action originates from a workflow (i.e. a non-empty workflow ID has been provided), go to the page for updating the workflow path step results
    //   - on the other hand, if this is a standalone action, go to the page for viewing an action record 
    if (submission.typeFormId === 'BoardReception') {
      const shipmentUUID = submission.componentUuid;
      const receptionLocation = submission.data.receptionLocation;
      const receptionDate = (submission.data.receptionDate).toString().slice(0, 10);

      let url = window.location.href = `/component/${shipmentUUID}/updateBoardLocations/${receptionLocation}/${receptionDate}`;
      url += `?actionId=${result}`;

      if (!(workflowId === '')) url += `?workflowId=${workflowId}`;

      window.location.href = url;
    } else {
      if (!(workflowId === '')) {
        window.location.href = `/workflow/${workflowId}/action/${result}`;
      } else {
        window.location.href = `/action/${result}`;
      }
    }
  }


  // Function to run for a failed submission
  function postFail(result, statusCode, statusMsg) {
    // If the submission result contains a response message, display it along with the appropriate Formio alert type
    // Otherwise, display any status message and error code instead
    if (result.responseText) {
      typeForm.setAlert('danger', result.responseText);
    } else {
      typeForm.setAlert('danger', `${statusMsg} (${statusCode})`);
    }

    // Display a 'submission error' message
    typeForm.emit('submitError');
  }
};
