// Declare a variable to hold the completed type form that will eventually be submitted to the database
let typeForm;

// Declare a list of the available 'reception' related action type forms
// NOTE: this must be the same as the equivalent list given in 'lib/Actions.js'
const reception_typeFormIDs = ['APAShipmentReception', 'BoardReception', 'CEAdapterBoardReception', 'DWAComponentShipmentReception', 'GroundingMeshShipmentReception', 'PopulatedBoardKitReception'];

// Declare a list of the available 'board installation' and 'mesh installation' action type forms
// NOTE: this must be the same as the equivalent list given in 'lib/Actions.js'
const installation_typeFormIDs = [
  'g_foot_board_install', 'g_head_board_install_sideA', 'g_head_board_install_sideB', 'x_foot_board_install', 'x_head_board_install_sideA', 'x_head_board_install_sideB',
  'u_foot_boards_install', 'u_head_board_install_sideA', 'u_head_board_installation_sideB', 'u_side_board_install_HSB', 'u_side_board_install_LSB',
  'v_foot_board_install', 'v_head_board_install_sideA', 'v_head_board_install_sideB', 'v_side_board_install_HSB', 'v_side_board_install_LSB',
  'prep_mesh_panel_install',
];


// Run a specified function when the page is loaded
window.addEventListener('load', onPageLoad);


// Function to run when the page is loaded
async function onPageLoad() {
  // Set up a new type form based on the schema of the action type form, and add a 'Submit' button (this is only in the scope of this script)
  let schema = actionTypeForm.schema;

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

  // Populate the type form with the contents of the action object
  //   - if we are performing a new action, this won't make any changes
  //   - if we are editing an existing action, this is where the existing information is filled in
  typeForm.submission = Object.assign(typeForm.submission, action);

  // When the 'Submit' button is pressed, run the appropriate event handler callback function
  // This is a Formio event handler, NOT a jQuery one (the code syntax '.on' is identical, but the input argument and callback structure are different)
  typeForm.on('submit', function (submission) {
    // At this point, the 'submission' object contains ONLY the information that has been entered into the type form (i.e. the 'data' field)
    // Add all other required information, inheriting from the variables that were passed through the route to this page
    submission.typeFormId = actionTypeForm.formId;
    submission.componentUuid = componentUuid;

    // If the action originates from a workflow (and therefore a non-empty workflow ID has been provided), save the workflow ID into the 'submission' object
    if (!(workflowId === '')) submission.workflowId = workflowId;

    // Once all additions and changes to the 'submission' object have been completed, submit it to the database
    SubmitData(submission);
  });
}


// Function to submit the record to the database
function SubmitData(submission) {
  let url = '/json/action';

  if (reception_typeFormIDs.includes(submission.typeFormId)) {
    url += `?location=${submission.data.receptionLocation}&date=${(submission.data.receptionDate).toString().slice(0, 10)}`;
  } else if (installation_typeFormIDs.includes(submission.typeFormId)) {
    url += `?location=${'installed_on_APA'}&date=${(new Date()).toISOString().slice(0, 10)}`;
  }

  $.ajax({
    contentType: 'application/json',
    method: 'post',
    url: url,
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

    // Display a message to indicate successful submission
    typeForm.emit('submitDone');

    // Redirect the user to the appropriate post-submission page (where 'result' is the action record's action ID)
    // - if the action originates from a workflow, go to the page for updating the workflow path step results and completion status
    // - if this is a standalone action, go to the page for viewing the action record
    let url = '';

    if (!(workflowId === '')) {
      url = `/workflow/${workflowId}/${stepIndex}/${result}`;
    } else {
      url = `/action/${result}`;
    }

    window.location.href = url;
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

    // Display a message to indicate that there was an error in submission
    typeForm.emit('submitError');
  }
};
