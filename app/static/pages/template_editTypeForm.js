// Retrieve the pre-defined Formio components
const formioComponents = Formio.Components.components;

// Set up the Formio form builder GUI - this is the red-outlined box appearing on all 'Edit Type Form' pages
const builder_config = {
  noDefaultSubmitButton: true,

  builder: {
    single: {
      title: 'Single Data Value',
      default: true,
      weight: 0,
      components: {
        textfield: true,
        textarea: true,
        number: true,
        NumberTolerance: true,
      },
    },

    multiple: {
      title: 'Multiple Data Values',
      weight: 10,
      components: {
        BarPlot: true,
        datamap: true,
        datagrid: true,
        editgrid: true,
        NumberArray: true,
        NumberArray_NoPlots: true,
        ScatterPlot: true,
        tree: true,
      },
    },

    enumeration: {
      title: 'Enumerations',
      default: false,
      weight: 20,
      components: {
        checkbox: true,
        radio: true,
        select: true,
        selectboxes: true,
      }
    },

    other: {
      title: 'Other',
      weight: 30,
      components: {
        ComponentUUID: true,
        ActionID: true,
        WorkflowID: true,
        content: true,
        columns: true,
        datetime: true,
        htmlelement: true,
        table: true,
      }
    },

    basic: false,
    advanced: false,
    data: false,
    premium: false,
    layout: false,
  }
};

// Declare variables to hold the (initially empty) Formio form builder object and the completed metadata and type forms that will eventually be submitted to the database
let builder = null;
let metaForm, typeForm;

// Define the URL that the user will be redirected to after type form submission (this is dependent on which collection is specified)
let redirectURL = '';

if (collection === 'componentForms') redirectURL = '/componentTypes/list';
if (collection === 'actionForms') redirectURL = '/actionTypes/list';
if (collection === 'workflowForms') redirectURL = '/workflowTypes/list';


// Main function
$(function () {
  // Render the metadata form in the page element called 'metaform' ...
  Formio.createForm(document.getElementById('metaform'), metaschema)
    .then((createdForm) => {
      // ... then set the to-be-submitted metadata form to be equal to the rendered metadata form
      metaForm = createdForm;

      // Attempt to retrieve the current type form record for the specified type form ID in the specified record collection, and throw an error if no such type form exists
      // If the retrieval is successful, continue to the function that deals with changes to the metadata and type forms
      $.get(`/json/${collection}/${formId}`, ChangeRecordData)
        .fail(function () {
          $('#builder').html(`Error - no type form currently exists for type form ID = ${formId}`);
        });

      // When the 'Submit' button is pressed, run the appropriate event handler callback function
      // This is a Formio event handler, NOT a jQuery one (the code syntax '.on' is identical, but the input argument and callback structure are different)
      metaForm.on('submit', function (submission) {
        // No additions or changes need to be made to the 'submission' object, so just submit it to the database
        SubmitData(submission);
      });
    });
});


// Function for populating and changing the metadata and type forms
function ChangeRecordData(record) {
  // If no type form name is present (i.e. if creating a new type form), set it to be the same as the type form ID
  if (!record.formName || (record.formName.length == 0)) record.formName = record.formId;

  // Increment the type form's version number and set the type form's validity start date to be now
  record.validity.version += 1;
  record.validity.startDate = (new Date()).toISOString();

  // Populate the metadata form's submission object with the current form's contents
  metaForm.submission = { data: record };

  // Update the 'View JSON Schema' box with the current type form schema
  $('#schema').val(JSON.stringify(record.schema, null, 2));

  // Set the form according to the current form's schema, either manually or automatically if using a Formio builder
  if (builder) {
    builder.setForm(record.schema);
  } else {
    // Render the 'builder_config' object defined above in the page element called 'formbuilder_area'
    builder = new Formio.FormBuilder($('.formbuilder_area').get(0), record.schema || {}, builder_config);

    $('input#commit-schema').val(JSON.stringify(schema));

    // Once the builder is ready, i.e. the form has been rendered ...
    builder.instance.ready.then(function () {
      // Set up the type form, either manually or through the built-in Formio form builder if it is being used
      if (builder_wizard) builder.setDisplay('wizard').then(BuildTypeForm);
      else BuildTypeForm();

      // Set what should be done on specific Formio event handlers
      builder.instance.on('change', BuildTypeForm);
      builder.instance.on('saveComponent', BuildTypeForm);
      builder.instance.on('editComponent', BuildTypeForm);
    });
  }
}


// Function to build (or rebuild) the type form
function BuildTypeForm() {
  // Populate the metadata form's submission 'schema' field with the currently defined type form schema
  metaForm.submission.data.schema = builder.instance.schema;

  // Update the JSON schema box with the current type form schema
  $('#schema').val(JSON.stringify(builder.instance.schema, null, 2));

  // Make sure that the 'typeform' page element is empty, then render the currently defined type form in the page element ...
  $('#typeform').empty();

  new Formio.createForm(document.getElementById('typeform'), builder.instance.form)
    .then(function (renderedTypeForm) {
      // ... and set the to-be-submitted type form to be equal to the rendered type form
      typeForm = renderedTypeForm;

      // When the type form is changed, set the type form data equal to the current submission object of the rendered form
      // This is a Formio event handler, NOT a jQuery one (the code syntax '.on' is identical, but the input argument and callback structure are different)
      typeForm.on('change', function () {
        $('#typedata').html(JSON.stringify(renderedTypeForm.submission, null, 2))
      });
    })
};


// Automatically update the rendered type form to reflect changes made to the contents of the JSON schema box
$('#schema').change(function () {
  // Set the builder object's form data equal to the contents of the text box
  builder.form = JSON.parse($('#schema').val());

  // Set the metadata form's schema equal to the builder object's current schema
  metaForm.submission.data.schema = builder.instance.schema;
});


// When the 'Download Schema' link is clicked, write the contents of the JSON schema box to a file and then download the file
function DownloadSchema() {
  const schema = $('#schema').val();
  const schema_obj = window.URL.createObjectURL(new Blob([schema], { type: 'application/JSON' }));

  $('#download_schema').attr('href', schema_obj);
}


// When the 'Copy Schema to Clipboard' button is pressed, copy the contents of the JSON schema box to the device's clipboard
function CopySchemaToClipboard() {
  navigator.clipboard.writeText($('#schema').val()).then({
  }, function (err) {
    console.error('Error - could not copy schema', err);
  })
};


// Function to submit the record to the database
function SubmitData(submission) {
  $.ajax({
    contentType: 'application/json',
    method: 'post',
    url: `/json/${collection}/${formId}`,
    data: JSON.stringify(submission.data),
    dataType: 'json',
    success: postSuccess,
  }).fail(postFail);


  // Function to run for a successful submission
  function postSuccess(result) {
    // If the submission result contains an error (even with a successful submission), display it along with the appropriate Formio alert type
    if (result.error) {
      metaForm.setAlert('warning', result.error);
      metaForm.emit('error', result.error);
    }

    // Display a message to indicate successful submission
    metaForm.emit('submitDone');

    // Redirect the user back to the page for viewing a list of type forms
    window.location.href = redirectURL;
  }


  // Function to run for a failed submission
  function postFail(result, statusCode, statusMsg) {
    // If the submission result contains a response message, display it along with the appropriate Formio alert type
    // Otherwise, display any status message and error code instead
    if (result.responseText) {
      metaForm.setAlert('danger', result.responseText);
    } else {
      metaForm.setAlert('danger', `${statusMsg} (${statusCode})`);
    }

    // Display a message to indicate that there was an error in submission
    metaForm.emit('submitError');
  }
};
