// Declare variables to hold the user-specified APA UUIDs
let apa1Uuid = null;
let apa2Uuid = null;

// Run a specific function when the page is loaded
window.addEventListener('load', renderSearchForms);


// Function to run when the page is loaded
async function renderSearchForms() {
  // Create a Formio form consisting of a component UUID input box, and render it in the page elements called 'apa1uuidform' and 'apa2uuidform'
  const componentUuidSchema = {
    components: [{
      type: 'ComponentUUID',
      label: 'Component UUID',
      key: 'componentUuid',
      input: true,
      hideLabel: true,
    }],
  }

  const apa1UuidForm = await Formio.createForm(document.getElementById('apa1uuidform'), componentUuidSchema);
  const apa2UuidForm = await Formio.createForm(document.getElementById('apa2uuidform'), componentUuidSchema);

  // When the content of either component UUID input box is changed, get the text string from the box
  // If the string is consistent with a valid UUID, set the value of the corresponding parameter
  apa1UuidForm.on('change', function () {
    if (apa1UuidForm.isValid()) {
      const apa1UuidInput = apa1UuidForm.submission.data.componentUuid;

      if (apa1UuidInput && apa1UuidInput.length === 36) apa1Uuid = apa1UuidInput;
    }
  });

  apa2UuidForm.on('change', function () {
    if (apa2UuidForm.isValid()) {
      const apa2UuidInput = apa2UuidForm.submission.data.componentUuid;

      if (apa2UuidInput && apa2UuidInput.length === 36) apa2Uuid = apa2UuidInput;
    }
  });

  // When the confirmation button is pressed, perform the information retrieval using the appropriate jQuery 'ajax' call and the current values of the parameters
  // Additionally, disable the confirmation button while the current retrieval is being performed
  $('#confirmButton').on('click', function () {
    $('#confirmButton').prop('disabled', true);

    if (apa1Uuid && apa2Uuid) {
      $.ajax({
        contentType: 'application/json',
        method: 'GET',
        url: `/json/components/hwdbInformation/${apa1Uuid}/${apa2Uuid}`,
        dataType: 'json',
        success: postSuccess,
      }).fail(postFail);
    }
  });
}


// Function to run for a successful retrieval query
function postSuccess(result) {
  // Make sure that the page elements where the information will be displayed are all empty
  $('#apa1info').empty();
  $('#apa2info').empty();

  // Show the APA and doublet information in their corresponding page elements
  $('#apa1info').val(JSON.stringify(result[0], null, 2));
  $('#apa2info').val(JSON.stringify(result[1], null, 2));

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


// When any of the 'Download Info' links are clicked, write the contents of the corresponding JSON schema box to a file and then download the file
function DownloadInfo(selector) {
  let info = null;
  let info_obj = null;

  if (selector === 1) {
    info = $('#apa1info').val();
    info_obj = window.URL.createObjectURL(new Blob([info], { type: 'application/JSON' }));

    $('#download_apa1info').attr('href', info_obj);
  } else if (selector === 2) {
    info = $('#apa2info').val();
    info_obj = window.URL.createObjectURL(new Blob([info], { type: 'application/JSON' }));

    $('#download_apa2info').attr('href', info_obj);
  }
}


// When any of the 'Copy Info to Clipboard' buttons are pressed, copy the contents of the corresponding JSON schema box to the device's clipboard
function CopyInfoToClipboard(selector) {
  if (selector === 1) {
    navigator.clipboard.writeText($('#apa1info').val()).then({
    }, function (err) {
      console.error('Error - could not copy APA 1 info', err);
    })
  } else if (selector === 2) {
    navigator.clipboard.writeText($('#apa2info').val()).then({
    }, function (err) {
      console.error('Error - could not copy APA 2 info', err);
    })
  }
};

