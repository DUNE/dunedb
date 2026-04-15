// Declare a variable to hold the user-specified component UUID
let componentUuid = null;
let filename = 'hwdbInfo_noComponentSpecified.json';

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
  // If the string is consistent with a valid UUID, set the value of the corresponding parameter
  componentUuidForm.on('change', function () {
    if (componentUuidForm.isValid()) {
      const componentUuidInput = componentUuidForm.submission.data.componentUuid;

      if (componentUuidInput && componentUuidInput.length === 36) componentUuid = componentUuidInput;
    }
  });

  // When the confirmation button is pressed, perform the information retrieval using the appropriate jQuery 'ajax' call and the current values of the parameters
  // Additionally, disable the confirmation button while the current retrieval is being performed
  $('#confirmButton').on('click', function () {
    $('#confirmButton').prop('disabled', true);

    if (componentUuid) {
      $.ajax({
        contentType: 'application/json',
        method: 'GET',
        url: `/json/components/hwdbInformation/${componentUuid}`,
        dataType: 'json',
        success: postSuccess,
      }).fail(postFail);
    }
  });
}


// Function to run for a successful retrieval query
function postSuccess(result) {
  // Make sure that the page elements where the component information will be displayed are all empty
  $('#componentinfo').empty();

  // Show the component information in its corresponding page element, and use the information to set the filename to be used for downloading the JSON file
  $('#componentinfo').val(JSON.stringify(result, null, 2));

  filename = result['specifications']['component']['filename'];

  // Re-enable the confirmation button for the next retrieval
  $('#confirmButton').prop('disabled', false);
};


// Function to run for a failed retrieval query
function postFail(result, statusCode, statusMsg) {
  // If the query result contains a response message, display it, and if not, display any status message and error code instead
  if (result.responseText) {
    console.log('POSTFAIL: ', result.responseText);
  } else {
    console.log('POSTFAIL: ', `${statusMsg} (${statusCode})`);
  }

  // Re-enable the confirmation button for the next retrieval
  $('#confirmButton').prop('disabled', false);
};


// When the 'Download Info' link is clicked, write the contents of the JSON schema box to a file and then download the file
function DownloadInfo() {
  const info = $('#componentinfo').val();
  const info_obj = window.URL.createObjectURL(new Blob([info], { type: 'application/JSON' }));

  $('#download_componentinfo').attr('download', filename);
  $('#download_componentinfo').attr('href', info_obj);
}


// When the 'Copy Info to Clipboard' button is pressed, copy the contents of the JSON schema box to the device's clipboard
function CopyInfoToClipboard() {
  navigator.clipboard.writeText($('#componentinfo').val()).then({
  }, function (err) {
    console.error('Error - could not copy component info', err);
  })
};

