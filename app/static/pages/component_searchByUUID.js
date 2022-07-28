// Run a specific function when the page is loaded
window.addEventListener('load', renderUUIDForm);


/// Function to run when the page is loaded
async function renderUUIDForm() {
  // Create a Formio form consisting of a component UUID box
  const schema = {
    components: [{
      type: 'ComponentUUID',
      label: 'Component UUID',
      key: 'componentUuid',
      validate: { 'required': true, },
      input: true,
      autofocus: true,
    }],
  }

  // Render the Formio form in the page element called 'uuidform'
  const uuidForm = await Formio.createForm(document.getElementById('uuidform'), schema);

  // The form operates via auto-complete, allowing the user to type in a component UUID
  // If a valid UUID is provided, create the URL for the corresponding component's information page, and then go to that page
  uuidForm.on('change', function () {
    if (uuidForm.isValid()) {
      const uuid = uuidForm.submission.data.componentUuid;

      if (uuid && uuid.length === 36) window.location.href = `/component/${uuid}`;
    }
  });
}
