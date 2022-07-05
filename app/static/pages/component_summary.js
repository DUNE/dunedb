// Run a specific function when the page is loaded
window.addEventListener('load', populateSummarySections);


/// Function to run when the page is loaded
async function populateSummarySections() {
  // First, deal with the component section
  // Render the component type form in the page element called 'componenttypeform'
  let compTypeForm = await Formio.createForm(document.getElementById('componenttypeform'), componentTypeForm.schema, { readOnly: true, });

  // Populate the type form with data from the component record
  compTypeForm.submission = component;

  // Disable the submission functionality (since the form is only to be displayed, not used)
  compTypeForm.nosubmit = true;

  // Next, deal with any action sections
  // For each action section ...
  $('div.section.actionSection').each(function () {
    // Retrieve the corresponding page element, and the data to be entered
    const actiontypeform = $('.actiontypeform', this);
    const action = actiontypeform.data('record');

    // Retrieve the action type form using the direct URL to its JSON record
    const actionTypeForm_url = `/json/actionForms/${action.typeFormId}`;

    $.get(actionTypeForm_url, function (actionTypeForm) {
      // Render the action type form in the corresponding page element
      // Then populate the type form with data from the component record ...
      // ... and disable the submission functionality (since the form is only to be displayed, not used)
      Formio.createForm(actiontypeform[0], actionTypeForm.schema, { readOnly: true, })
        .then(function (typeForm) {
          typeForm.submission = action;
          typeForm.nosubmit = true;
        });
    })
  })
}
