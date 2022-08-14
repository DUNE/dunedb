// Retrieve the pre-defined Formio components
const formioComponents = Formio.Components.components;

// Set up the Formio form builder GUI
// This is the red-outlined box appearing on all 'Edit Type Form' pages that allows the user to build a specific type form
const builder_config = {
  noDefaultSubmitButton: true,

  builder: {
    dataentry: {
      title: 'Data entry',
      default: true,
      weight: 0,
      components: {
        textfield: true,
        textarea: true,
        number: true,
        SpecNumberComponent: true,
        ArrayComponent: true,
      },
    },

    dataentryLeft:
    {
      title: "Data / label left",
      default: false,
      weight: 5,
      components: {
        textfield_left: deepmerge(formioComponents.textfield.builderInfo, { schema: { labelPosition: 'left-right' } }),
        specnumber_left: deepmerge(SpecNumberComponent.builderInfo, { schema: { labelPosition: 'left-right' } }),
      }
    },

    enumerated: {
      title: 'Enumerations',
      default: false,
      weight: 10,
      components: {
        radio: true,
        checkbox: true,
        select: true,
        selectboxes: true,
      }
    },

    specialized: {
      title: 'Specialized',
      weight: 20,
      components: {
        ComponentUUID: true,
        ActionID: true,
        WorkflowID: true,
        url: true,
        datetime: true,
        ImageAnnotator: true,
        image: deepmerge(formioComponents.file.builderInfo, {
          title: 'Image upload',
          schema: {
            label: 'Picture upload',
            key: 'picture',
            image: true,
          },
        }),
        CustomGeoTagComponent: true,
      }
    },

    multiple: {
      title: 'Multiple',
      weight: 30,
      components: {
        datamap: true,
        datagrid: true,
        editgrid: true,
        tree: true,
      },
    },

    layout: {
      title: 'Layout',
      default: false,
      weight: 40,
      components: {
        htmlelement: {
          title: 'HTML',
          icon: 'code',
          weight: 1000,
          schema: { type: 'htmlelement' }
        },
        content: true,
        columns: true,
        fieldset: true,
        panel: true,
        table: true,
        tabs: true,
        well: true,
        container: true,
        DatabaseImage: true,
        AnnotatedImage: true,
      }
    },

    misc: {
      title: 'Little-used',
      default: false,
      weight: 1000,
      components: {
        hidden: true,
        tags: true,
        email: true,
        phoneNumber: true,
        address: true,
        day: true,
        time: true,
        signature: true,
        button: true,
        saveDraftButton: {
          title: 'Save Draft button',
          icon: 'button',
          weight: 1000,
          schema: {
            type: 'button',
            action: 'saveState',
            state: 'draft',
            theme: 'secondary',
            key: 'saveAsDraft',
            label: 'Save Draft'
          },
        },
      },
    },

    basic: false,
    advanced: false,
    data: false,
    premium: false,
  }
};


// Declare a variable to hold the (initially empty) Formio form builder object
let builder = null;

// Declare variables to hold the completed metadata and type forms that will eventually be submitted to the database
let metaForm, typeForm;

// Define the URL that the user will be redirected to after type form submission (dependent on which collection is specified)
let entityRoute = '';

if (collection === 'componentForms') entityRoute = 'componentTypes/list';
if (collection === 'actionForms') entityRoute = 'actionTypes/list';
if (collection === 'workflowForms') entityRoute = 'workflowTypes/list';


/// Main function
$(function () {
  // Render the metadata form in the page element called 'metaform' ...
  Formio.createForm(document.getElementById('metaform'), metaschema)
    .then((createdForm) => {
      // ... then set the to-be-submitted metadata form to be equal to the rendered metadata form
      metaForm = createdForm;

      // When the metadata form is submitted (via clicking on the 'Submit' button), run the appropriate event handler callback function
      // This is a Formio event handler, NOT a jQuery one (the code syntax '.on' is identical, but the input argument and callback structure are different)
      metaForm.on('submit', function (submission) {
        // No additions or changes need to be made to the 'submission' object, so just submit it to the database
        SubmitData(submission);
      });

      // Attempt to retrieve the current type form record for the specified type form ID in the specified record collection, and throw an error if no such type form exists
      // If the retrieval is successful, continue to the function that deals with changes to the metadata and type forms
      $.get(`/json/${collection}/${formId}`, ChangeRecordData)
        .fail(function () {
          $('#builder').html(`Error - no type form currently exists for type form ID = ${formId}`);
        });
    });
});


/// Function for populating and changing the metadata and type forms
function ChangeRecordData(record) {
  // If no type form name is already present (i.e. if creating a new type form), set it to be the same as the type form ID
  if (!record.formName || (record.formName.length == 0)) record.formName = record.formId;

  // Increment the type form's version number
  record.validity.version += 1;

  // Set the type form's validity start date to be now
  record.validity.startDate = moment().toISOString();

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

      // Set which actions are to be taken on specific Formio event handlers
      builder.instance.on('change', BuildTypeForm);
      builder.instance.on('saveComponent', BuildTypeForm);
      builder.instance.on('editComponent', BuildTypeForm);
    });
  }
}


/// Function to build (or rebuild) the type form
function BuildTypeForm() {
  // Populate the metadata form's submission 'schema' field with the currently defined type form schema
  metaForm.submission.data.schema = builder.instance.schema;

  // Update the 'View JSON Schema' box with the current type form schema
  $('#schema').val(JSON.stringify(builder.instance.schema, null, 2));

  // Set up an empty page element called 'typeform'
  $('#typeform').empty();

  // Render the currently defined type form in the page element ...
  new Formio.createForm(document.getElementById('typeform'), builder.instance.form)
    .then(function (renderedTypeForm) {
      // ... then set the to-be-submitted type form to be equal to the rendered type form
      typeForm = renderedTypeForm;

      // When the type form is changed, set the type form data equal to the current submission object of the rendered form
      // This is a Formio event handler, NOT a jQuery one (the code syntax '.on' is identical, but the input argument and callback structure are different)
      typeForm.on('change', function () {
        $('#typedata').html(JSON.stringify(renderedTypeForm.submission, null, 2))
      });
    })
};


// Automatically update the rendered type form to reflect changes made to the contents of the 'View JSON Schema' text box
$('#schema').change(function () {
  // Set the builder object's form data equal to the contents of the text box
  builder.form = JSON.parse($('#schema').val());

  // Set the metadata form's schema equal to the builder object's current schema
  metaForm.submission.data.schema = builder.instance.schema;
});


// When the 'Download Schema' link is clicked, write the schema to a file and then download the file
function DownloadSchema() {
  const schema = $('#schema').val();
  const schema_obj = window.URL.createObjectURL(new Blob([schema], { type: 'application/JSON' }));

  $('#download_schema').attr('href', schema_obj);
}


// When the 'Copy Schema to Clipboard' button is pressed, perform the copy to clipboard
function CopySchemaToClipboard() {
  navigator.clipboard.writeText($('#schema').val()).then({
  }, function (err) {
    console.error('Error - could not copy schema', err);
  })
};


// When the 'Paste Schema from Clipboard' button is pressed, perform the paste from clipboard
// NOTE: by default, this does not work in Firefox (which does not allow the 'readText' function to be called from websites, only via browser extensions)
// To get around this, please do the following:
//   - navigate to 'about:config' and 'accept the risk and continue'
//   - search for 'dom.events.testing.asyncClipboard', and set it to 'true'
//   - refresh the 'Edit Type Form' page
function PasteSchemaFromClipboard() {
  navigator.clipboard.readText().then((schema) => {
    $('#schema').val(schema);
    $('#schema').trigger('change');
  })
    .catch((err) => {
      console.error('Error - could not paste schema', err);
    });
};


/// Function to submit the completed 'submission' object to the database
function SubmitData(submission) {
  // Submit the 'submission' object via a jQuery 'ajax' call, with the success and failure functions as defined below
  $.ajax({
    contentType: 'application/json',
    method: 'post',
    url: `/json/${collection}/${formId}`,
    data: JSON.stringify(submission.data),
    dataType: 'json',
    success: postSuccess,
  }).fail(postFail);


  /// Function to run for a successful submission
  function postSuccess(result) {
    // If the submission result contains an error (even with a successful submission), display it along with the appropriate Formio alert type
    if (result.error) {
      metaForm.setAlert('warning', result.error);
      metaForm.emit('error', result.error);
    }

    // Display a 'submission complete' message
    metaForm.emit('submitDone');

    // Redirect the user back to the page for viewing a list of entity type forms
    window.location.href = `/${entityRoute}`;
  }


  /// Function to run for a failed submission
  function postFail(result, statusCode, statusMsg) {
    // If the submission result contains a response message, display it along with the appropriate Formio alert type
    // Otherwise, display any status message and error code instead
    if (result.responseText) {
      metaForm.setAlert('danger', result.responseText);
    } else {
      metaForm.setAlert('danger', `${statusMsg} (${statusCode})`);
    }

    // Display a 'submission error' message
    metaForm.emit('submitError');
  }
};
