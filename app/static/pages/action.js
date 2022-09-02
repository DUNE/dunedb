// Run a specific function when the page is loaded
window.addEventListener('load', populateTypeForm);


// Function to run when the page is loaded
async function populateTypeForm() {
  // Render the action type form in the page element called 'typeform'
  let typeForm = await Formio.createForm(document.getElementById('typeform'), actionTypeForm.schema, { readOnly: true, });

  // Populate the type form with data from the action record, and disable the submission functionality (since the form is only to be displayed, not used)
  typeForm.submission = action;
  typeForm.nosubmit = true;
}
