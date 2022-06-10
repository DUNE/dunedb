// Run a specific function when the page is loaded
window.addEventListener('load', renderUUIDForm);


/// Function to run when the page is loaded
async function renderUUIDForm() {
  // Create a Formio form consisting of a component UUID box
  var schema = {
    "components": [{
      "type": "ComponentUUID",
      "label": "Component UUID",
      "key": "componentUuid",
      "validate": { "required": true },
      "input": true,
      "autofocus": true
    }]
  }

  // Render the Formio form in the page element called 'uuidform'
  uuidForm = await Formio.createForm(document.getElementById('uuidform'), schema);

  // The form operates via auto-complete, allowing the user to type in a component UUID
  // If a valid UUID is provided, create the URL for performing the action on the corresponding component, and then go to that page
  uuidForm.on("change", function () {
    if (uuidForm.isValid()) {
      var uuid = uuidForm.submission.data.componentUuid;

      if (uuid && uuid.length > 10) {
        window.location.assign('/action/' + actionTypeFormId + '/' + uuid)
      }
    }
  });
}
