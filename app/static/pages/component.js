// Run a specific function when the page is loaded
window.addEventListener('load', populateTypeForm);


// Function to run when the page is loaded
async function populateTypeForm() {
  // Render the component type form in the page element called 'typeform'
  let typeForm = await Formio.createForm(document.getElementById('typeform'), componentTypeForm.schema, { readOnly: true, });

  // Populate the type form with data from the component record and disable the submission functionality (since the form is only to be displayed, not used)
  typeForm.submission = component;
  typeForm.nosubmit = true;
};


// When the 'Copy UUID' button is pressed, copy the UUID to the device's clipboard, and change the button's appearance to confirm success
function CopyUUID(componentUUID) {
  navigator.clipboard.writeText(componentUUID).then(function () {
    document.getElementById('copy_uuid').innerHTML = 'Copied';
    document.getElementById('copy_uuid').style.backgroundColor = 'green';
  }, function (err) {
    document.getElementById('copy_uuid').innerHTML = 'ERROR';
    document.getElementById('copy_uuid').style.backgroundColor = 'red';

    console.error('Error - could not copy component UUID', err);
  })
};


// When the 'Download List of Links' button is pressed, write a list of QR code URLs to a file and then download the file
function DownloadLinks(shortUuids) {
  let links_text = '';

  for (const shortUuid of shortUuids) {
    const link = `${base_url}/c/${shortUuid}\n`;
    links_text = links_text.concat(link);
  }

  const links_obj = window.URL.createObjectURL(new Blob([links_text], { type: 'text/plain' }));

  $('#download_links').attr('href', links_obj);
};
