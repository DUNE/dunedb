// Run a specific function when the page is loaded
window.addEventListener('load', populateTypeForm);


// Function to run when the page is loaded
async function populateTypeForm() {
  // Render the action type form in the page element called 'typeform'
  let typeForm = await Formio.createForm(document.getElementById('typeform'), actionTypeForm.schema, { readOnly: true, });

  // Populate the type form with data from the action record, and disable the submission functionality (since the form is only to be displayed, not used)
  typeForm.submission = action;
  typeForm.nosubmit = true;

  // Reset any selected image files and the associated filename display text
  $('#image-selector').val('');
  $('#image-filenames').text('');
}


// When the 'Copy ID' button is pressed, copy the action ID to the device's clipboard, and change the button's appearance to confirm success
function CopyID(actionID) {
  navigator.clipboard.writeText(actionID).then(function () {
    document.getElementById('copy_id').innerHTML = 'Copied';
    document.getElementById('copy_id').style.backgroundColor = 'green';
  }, function (err) {
    document.getElementById('copy_id').innerHTML = 'ERROR';
    document.getElementById('copy_id').style.backgroundColor = 'red';

    console.error('Error - could not copy action ID', err);
  })
};


// When the 'Download List of Changed Tensions' button is pressed, write a list of the changed tensions to a file and then download the file
function DownloadChangedTensions(retensionedWires) {
  let tensions_text = '';

  for (const changedTension of retensionedWires[0]) {
    const tensions_line = `A    ${changedTension[0]}    ${changedTension[1]}    ${changedTension[2]}\n`;
    tensions_text = tensions_text.concat(tensions_line);
  }

  for (const changedTension of retensionedWires[1]) {
    const tensions_line = `B    ${changedTension[0]}    ${changedTension[1]}    ${changedTension[2]}\n`;
    tensions_text = tensions_text.concat(tensions_line);
  }

  const tensions_obj = window.URL.createObjectURL(new Blob([tensions_text], { type: 'text/plain' }));

  $('#download_changedTensions').attr('href', tensions_obj);
};


// When one or more images is selected, display their name(s) in the space between the selection and confirmation buttons
// Also change the colour and text of the confirmation button to indicate that at least one image has been selected
function DisplayFileNames(element) {
  const files = Array.from(element.files);
  let fileNames = files.map(f => { return f.name }).join(' ] , [ ');
  fileNames = '[ ' + fileNames + ' ]';

  $('#image-filenames').text(fileNames);

  document.getElementById('confirm-button').style.backgroundColor = 'green';
};


// When the confirmation button is pressed, read in any selected images, convert them to base64-encoded strings, and store the strings in an array
// Then perform the submission of this array to the database, so the image strings can be added to the appropriate action record
function EncodeStoreImages() {
  // The 'FileReader.readAsDataURL()' function used to read each image is asynchronous, so we must set up each read as a promise
  // The encompassing 'GetAllImageData()' function returns a single promise that is fulfilled when all sub-promises are themselves fulfilled (i.e. all images have been read)
  // Each sub-promise 'resolves' to the image's base64-encoded string, i.e. that is the value associated with the sub-promise's fulfillment
  function GetAllImageData() {
    const imageFiles = document.getElementById('image-selector').files;
    let imagePromises = [];

    imageFiles.forEach(function (imageFile) {
      let imagePromise = new Promise(function (resolve, reject) {
        let reader = new FileReader();

        reader.onload = function (e) { resolve(reader.result); }

        reader.readAsDataURL(imageFile);

        if (reader.error) { reject(reader.error); }
      });

      imagePromises.push(imagePromise);
    });

    return Promise.all(imagePromises);
  }

  // Once the single encompassing promise is returned, the 'result' of the following '.then()' function is simply the array of image strings
  // Create a JSON object, containing a single field 'image' with the value equal to the array, and submit this object
  GetAllImageData().then(function (result) {
    let submission = {};
    submission.images = result;

    SubmitData(submission);
  });
}


// Function to submit the array of image strings to the database
function SubmitData(submission) {
  $.ajax({
    contentType: 'application/json',
    method: 'post',
    url: `/json/action/${action.actionId}/addImages`,
    data: JSON.stringify(submission),
    dataType: 'json',
    success: postSuccess,
  }).fail(postFail);


  // Function to run for a successful submission
  function postSuccess(result) {
    // If the submission result contains an error (even with a successful submission), display it
    if (result.error) {
      console.log('POSTSUCCESS error: ', result.error);
    }

    // Reload the page for viewing the action record
    window.location.reload();
  }


  // Function to run for a failed submission
  function postFail(result, statusCode, statusMsg) {
    // If the query result contains a response message, display it, and if not, display any status message and error code instead
    if (result.responseText) {
      console.log('POSTFAIL: ', result.responseText);
    } else {
      console.log('POSTFAIL: ', `${statusMsg} (${statusCode})`);
    }
  }
};
