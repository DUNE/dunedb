// Declare a variable to hold the completed type form that will eventually be submitted to the database
let typeForm;

// Run a specified function when the page is loaded
window.addEventListener('load', onPageLoad);


/// Function to run when the page is loaded
async function onPageLoad() {
  // Set up a new type form based on the schema of the workflow type form
  let schema = workflowTypeForm.schema;

  // Add a 'Submit' button to the type form (this is temporary, only in the scope of this script)
  schema.components.push({
    type: 'button',
    theme: 'btn btn-success',
    label: 'Submit Workflow Record',
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

  // Populate the type form with the contents of the workflow itself
  // If we are creating a new workflow, this won't make any changes
  // If we are editing an existing workflow, this is where the existing information is filled in
  typeForm.submission = Object.assign(typeForm.submission, workflow);

  // When the populated type form is submitted (via clicking on the 'Submit' button), run the appropriate event handler callback function
  // This is a Formio event handler, NOT a jQuery one (the code syntax '.on' is identical, but the input argument and callback structure are different)
  typeForm.on('submit', function (submission) {
    // At this point, the 'submission' object contains ONLY the information that has been entered into the type form by the user (the 'data' field)
    // Now add all other required information from the passed variables to the 'submission' object
    submission.typeFormId = workflowTypeForm.formId;
    submission.typeFormName = workflowTypeForm.formName;

    // Once all additions and changes to the 'submission' object have been completed, submit it to the database
    SubmitData(submission);
  });
}


/// Function to submit the completed 'submission' object to the database
function SubmitData(submission) {
  // Submit the 'submission' object via a jQuery 'ajax' call, with the success and failure functions as defined below
  $.ajax({
    contentType: 'application/json',
    method: 'post',
    url: '/json/workflow',
    data: JSON.stringify(submission),
    dataType: 'json',
    success: postSuccess,
  }).fail(postFail);


  /// Function to run for a successful submission
  function postSuccess(result) {
    // If the submission result contains an error (even with a successful submission), display it along with the appropriate Formio alert type
    if (result.error) {
      typeForm.setAlert('warning', result.error);
      typeForm.emit('error', result.error);
    }

    // Display a 'submission complete' message
    typeForm.emit('submitDone');

    // Redirect the user back to the page for viewing a workflow record ('result' is the workflow's workflow ID)
    window.location.href = `/workflow/${result}`;
  }


  /// Function to run for a failed submission
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
