// Run a specific function when the page is loaded
window.addEventListener('load', renderSearchForms);


/// Function to run when the page is loaded
async function renderSearchForms() {
  // Create a Formio form consisting of a component UUID input box
  const componentUuidSchema = {
    components: [{
      type: 'ComponentUUID',
      label: 'Component UUID',
      key: 'componentUuid',
      validate: { 'required': true, },
      input: true,
    }],
  }

  // Render the Formio form in the page element called 'componentuuidform'
  const componentUuidForm = await Formio.createForm(document.getElementById('componentuuidform'), componentUuidSchema);

  // The form operates via auto-complete, allowing the user to type in a component UUID
  // If a valid UUID is provided, create the URL for the corresponding component's information page, and then go to that page
  componentUuidForm.on('change', function () {
    if (componentUuidForm.isValid()) {
      const componentUuid = componentUuidForm.submission.data.componentUuid;

      if (componentUuid && componentUuid.length === 36) window.location.href = `/component/${componentUuid}`;
    }
  });

  // Create a Formio form consisting of an action ID input box
  const actionIdSchema = {
    components: [{
      type: 'ActionID',
      label: 'Action ID',
      key: 'actionId',
      validate: { 'required': true, },
      input: true,
    }],
  }

  // Render the Formio form in the page element called 'actionidform'
  const actionIdForm = await Formio.createForm(document.getElementById('actionidform'), actionIdSchema);

  // The form operates via auto-complete, allowing the user to type in an action ID
  // If a valid ID is provided, create the URL for the corresponding action's information page, and then go to that page
  actionIdForm.on('change', function () {
    if (actionIdForm.isValid()) {
      const actionId = actionIdForm.submission.data.actionId;

      if (actionId && actionId.length === 24) window.location.href = `/action/${actionId}`;
    }
  });

  // Create a Formio form consisting of a workflow ID input box
  const workflowIdSchema = {
    components: [{
      type: 'WorkflowID',
      label: 'Workflow ID',
      key: 'workflowId',
      validate: { 'required': true, },
      input: true,
    }],
  }

  // Render the Formio form in the page element called 'workflowidform'
  const workflowIdForm = await Formio.createForm(document.getElementById('workflowidform'), workflowIdSchema);

  // The form operates via auto-complete, allowing the user to type in a workflow ID
  // If a valid ID is provided, create the URL for the corresponding workflow's information page, and then go to that page
  workflowIdForm.on('change', function () {
    if (workflowIdForm.isValid()) {
      const workflowId = workflowIdForm.submission.data.workflowId;

      if (workflowId && workflowId.length === 24) window.location.href = `/workflow/${workflowId}`;
    }
  });
}
