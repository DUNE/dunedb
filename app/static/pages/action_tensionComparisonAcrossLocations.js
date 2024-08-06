// Declare a variable to hold the (initially empty) user-entered component UUID, wire layer, first location and second location
let componentUuid = null;
let wireLayer = null;
let originLocation = null;
let destinationLocation = null;

// Run a specific function when the page is loaded
window.addEventListener('load', renderComparisonForms);


// Function to run when the page is loaded
async function renderComparisonForms() {
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

  // When the content of the UUID input box is changed, get the text string from the box
  componentUuidForm.on('change', function () {
    if (componentUuidForm.isValid()) {
      componentUuid = componentUuidForm.submission.data.componentUuid;
    }
  });

  // When the selected wire layer is changed, get the newly selected layer
  $('#wireLayerSelection').on('change', async function () {
    wireLayer = $('#wireLayerSelection').val();
  });

  // When the selected origin location is changed, get the newly selected location
  $('#originLocationSelection').on('change', async function () {
    originLocation = $('#originLocationSelection').val();
  });

  // When the selected destination location is changed, get the newly selected location
  $('#destinationLocationSelection').on('change', async function () {
    destinationLocation = $('#destinationLocationSelection').val();
  });

  // When the 'Perform Comparison' button is pressed, perform the comparison using the appropriate jQuery 'ajax' call and the current values of the user-entered variables
  // Additionally, disable the 'Perform Comparison' button while the current comparison is being performed
  $('#confirmButton').on('click', function () {
    $('#confirmButton').prop('disabled', true);

    if (componentUuid && componentUuid.length === 36 && wireLayer && originLocation && destinationLocation) {
      $.ajax({
        contentType: 'application/json',
        method: 'GET',
        url: `/json/actions/tensionComparisonAcrossLocations/${componentUuid}/${wireLayer}/${originLocation}/${destinationLocation}`,
        dataType: 'json',
        success: postSuccess,
      }).fail(postFail);
    }
  })
}


// Function to run for a successful comparison query
function postSuccess(result) {
  // Make sure that the page elements where the results will be displayed are empty
  $('#results_originSideA').empty();
  $('#results_destinationSideA').empty();
  $('#results_diffsSideA').empty();
  $('#results_originSideB').empty();
  $('#results_destinationSideB').empty();
  $('#results_diffsSideB').empty();

  // The 'result' object will contain some permutation of null and non-null entries, corresponding to which record or records have been successfully found
  // Either display the appropriate message for the permutation if it indicates that something went wrong, or otherwise proceed to display the results
  if (!(result.origin_actionId) && !(result.destination_actionId)) {
    $('#results_originSideA').append('<b>Cannot find any tension measurement actions for the specified combination of Assembled APA UUID, Wire Layer, First Location and Second Location')
  } else if (!(result.origin_actionId) && result.destination_actionId) {
    $('#results_originSideA').append('<b>Cannot find a matching tension measurement action for the specified combination of Assembled APA UUID, Wire Layer and First Location')
  } else if (result.origin_actionId && !(result.destination_actionId)) {
    $('#results_originSideA').append('<b>Cannot find a matching tension measurement action for the specified combination of Assembled APA UUID, Wire Layer and Second Location')
  } else if (result.origin_actionId && (!(result.origin_sideA) || !(result.origin_sideB))) {
    $('#results_originSideA').append(`<b>The tension measurement action (ID = ${result.origin_actionId}) performed at ${$('#originLocationSelection option:selected').text()} does not contain measured values for one or both sides`)
  } else if (result.destination_actionId && (!(result.destination_sideA) || !(result.destination_sideB))) {
    $('#results_originSideA').append(`<b>The tension measurement action (ID = ${result.destination_actionId}) performed at ${$('#destinationLocationSelection option:selected').text()} does not contain measured values for one or both sides`)
  } else if (result.differences_sideA.length === 0) {
    $('#results_originSideA').append(`<b>The tension measurement actions performed at ${$('#originLocationSelection option:selected').text()}) (ID = ${result.origin_actionId}) and ${$('#destinationLocationSelection option:selected').text()}) (ID = ${result.destination_actionId}) have different numbers of values on side A`)
  } else if (result.differences_sideB.length === 0) {
    $('#results_originSideA').append(`<b>The tension measurement actions performed at ${$('#originLocationSelection option:selected').text()}) (ID = ${result.origin_actionId}) and ${$('#destinationLocationSelection option:selected').text()}) (ID = ${result.destination_actionId}) have different numbers of values on side B`)
  } else {
    // Create a set of Formio forms, populate each one with the appropriate data from the result object, and render them in the appropriate page elements
    Formio.createForm(document.getElementById('results_originSideA'), {
      components: [{
        type: 'TensionPlots',
        label: 'Measured Tensions (Side A) at First Location',
        key: 'measuredTensions_originSideA',
        input: true,
        disabled: true,
        units: 'Tension (N)',
        specification_nominal: 6.25,
        specification_toleranceInner: 2.25,
        axis_limitLower: 3.5,
        axis_limitUpper: 9.0,
      }]
    }).then((form) => {
      form.submission = {
        data: { measuredTensions_originSideA: result.origin_sideA }
      };
    });

    Formio.createForm(document.getElementById('results_destinationSideA'), {
      components: [{
        type: 'TensionPlots',
        label: 'Measured Tensions (Side A) at Second Location',
        key: 'measuredTensions_destinationSideA',
        input: true,
        disabled: true,
        units: 'Tension (N)',
        specification_nominal: 6.25,
        specification_toleranceInner: 2.25,
        axis_limitLower: 3.5,
        axis_limitUpper: 9.0,
      }]
    }).then((form) => {
      form.submission = {
        data: { measuredTensions_destinationSideA: result.destination_sideA }
      };
    });

    Formio.createForm(document.getElementById('results_diffsSideA'), {
      components: [{
        type: 'TensionPlots',
        label: 'Differences between Measured Tensions (Side A) [Second Location - First Location]',
        key: 'measuredTensions_diffsSideA',
        input: true,
        disabled: true,
        units: 'Tension (N)',
        specification_nominal: 0.00,
        specification_toleranceInner: 0.50,
        axis_limitLower: -1.5,
        axis_limitUpper: 1.5,
      }]
    }).then((form) => {
      form.submission = {
        data: { measuredTensions_diffsSideA: result.differences_sideA }
      };
    });

    Formio.createForm(document.getElementById('results_originSideB'), {
      components: [{
        type: 'TensionPlots',
        label: 'Measured Tensions (Side B) at First Location',
        key: 'measuredTensions_originSideB',
        input: true,
        disabled: true,
        units: 'Tension (N)',
        specification_nominal: 6.25,
        specification_toleranceInner: 2.25,
        axis_limitLower: 3.5,
        axis_limitUpper: 9.0,
      }]
    }).then((form) => {
      form.submission = {
        data: { measuredTensions_originSideB: result.origin_sideB }
      };
    });

    Formio.createForm(document.getElementById('results_destinationSideB'), {
      components: [{
        type: 'TensionPlots',
        label: 'Measured Tensions (Side B) at Second Location',
        key: 'measuredTensions_destinationSideB',
        input: true,
        disabled: true,
        units: 'Tension (N)',
        specification_nominal: 6.25,
        specification_toleranceInner: 2.25,
        axis_limitLower: 3.5,
        axis_limitUpper: 9.0,
      }]
    }).then((form) => {
      form.submission = {
        data: { measuredTensions_destinationSideB: result.destination_sideB }
      };
    });

    Formio.createForm(document.getElementById('results_diffsSideB'), {
      components: [{
        type: 'TensionPlots',
        label: 'Differences between Measured Tensions (Side B) [Second Location - First Location]',
        key: 'measuredTensions_diffsSideB',
        input: true,
        disabled: true,
        units: 'Tension (N)',
        specification_nominal: 0.00,
        specification_toleranceInner: 0.50,
        axis_limitLower: -1.5,
        axis_limitUpper: 1.5,
      }]
    }).then((form) => {
      form.submission = {
        data: { measuredTensions_diffsSideB: result.differences_sideB }
      };
    });
  }

  // Re-enable the 'Perform Comparison' button for the next comparison
  $('#confirmButton').prop('disabled', false);
};


// Function to run for a failed comparison query
function postFail(result, statusCode, statusMsg) {
  // If the query result contains a response message, display it, and if not, display any status message and error code instead
  if (result.responseText) {
    console.log('POSTFAIL: ', result.responseText);
  } else {
    console.log('POSTFAIL: ', `${statusMsg} (${statusCode})`);
  }

  // Re-enable the 'Perform Search' button for the next search
  $('#confirmButton').prop('disabled', false);
};
