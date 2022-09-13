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
      validate: { 'required': true, },
      input: true,
    }],
  }

  const componentUuidForm = await Formio.createForm(document.getElementById('componentuuidform'), componentUuidSchema);

  // If a valid UUID is entered, create the URL for the corresponding component's information page, and then go to that page
  componentUuidForm.on('change', function () {
    if (componentUuidForm.isValid()) {
      const componentUuid = componentUuidForm.submission.data.componentUuid;

      if (componentUuid && componentUuid.length === 36) window.location.href = `/component/${componentUuid}`;
    }
  });

  // Create a Formio form consisting of an action ID input box, and render it in the page element called 'actionidform'
  const actionIdSchema = {
    components: [{
      type: 'ActionID',
      label: 'Action ID',
      key: 'actionId',
      validate: { 'required': true, },
      input: true,
    }],
  }

  const actionIdForm = await Formio.createForm(document.getElementById('actionidform'), actionIdSchema);

  // If a valid ID is entered, create the URL for the corresponding action's information page, and then go to that page
  actionIdForm.on('change', function () {
    if (actionIdForm.isValid()) {
      const actionId = actionIdForm.submission.data.actionId;

      if (actionId && actionId.length === 24) window.location.href = `/action/${actionId}`;
    }
  });

  // Create a Formio form consisting of a workflow ID input box, and render it in the page element called 'workflowidform'
  const workflowIdSchema = {
    components: [{
      type: 'WorkflowID',
      label: 'Workflow ID',
      key: 'workflowId',
      validate: { 'required': true, },
      input: true,
    }],
  }

  const workflowIdForm = await Formio.createForm(document.getElementById('workflowidform'), workflowIdSchema);

  // If a valid ID is entered, create the URL for the corresponding workflow's information page, and then go to that page
  workflowIdForm.on('change', function () {
    if (workflowIdForm.isValid()) {
      const workflowId = workflowIdForm.submission.data.workflowId;

      if (workflowId && workflowId.length === 24) window.location.href = `/workflow/${workflowId}`;
    }
  });
}
