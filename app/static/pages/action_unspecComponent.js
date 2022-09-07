// Run a specific function when the page is loaded
window.addEventListener('load', renderUUIDForm);


// Function to run when the page is loaded
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
  // When the form is changed, i.e. something is entered into the input field ...
  uuidForm.on('change', function () {
    if (uuidForm.isValid()) {
      // ... and the input string is the correct length for a valid UUID ...
      const inputString = uuidForm.submission.data.componentUuid;

      if (inputString && inputString.length === 36) {
        // ... perform an 'ajax' query to attempt to retrieve the component record corresponding to the UUID
        // If the query is successful, i.e. the retrieved record is not 'null', this indicates that the UUID corresponds to an existing component
        // In this case, set up the URL for performing the action on the specified component, and go to that page
        return $.ajax({
          type: 'GET',
          url: `/json/component/${inputString}`,
          dataType: 'json',
          success: function (data) {
            if (data) window.location.href = `/action/${actionTypeFormId}/${inputString}`;
          },
        })
      }
    }
  });
}
