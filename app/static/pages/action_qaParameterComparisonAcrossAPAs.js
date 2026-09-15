// Declare a variable to hold the user-specified search parameters
let qaParameter = null;
let apaNumber = null;
let results_allAPAs = null;

// Run a specific function when the page is loaded
window.addEventListener('load', renderComparisonForms);


// Function to run when the page is loaded
async function renderComparisonForms() {
  // Get and set the value of any search parameter that is changed
  $('#qaParameterSelection').on('change', async function () {
    qaParameter = $('#qaParameterSelection').val();
  });

  $('#apaNumberSelection').on('change', async function () {
    apaNumber = $('#apaNumberSelection').val();
  });

  // When either confirmation button is pressed, perform the comparison using the appropriate jQuery 'ajax' call and the current values of the search parameters
  // Additionally, disable both confirmation buttons while the current comparison is being performed
  $('#confirmButton_allAPAs').on('click', function () {
    $('#confirmButton_allAPAs').prop('disabled', true);
    $('#confirmButton_singleAPA').prop('disabled', true);

    $('#results_singleAPA').empty();
    $('#results_allAPAs_xLayer').empty();
    $('#results_allAPAs_xLayer').empty().append('<b>Working ...</b>');
    $('#results_allAPAs_vLayer').empty();
    $('#results_allAPAs_uLayer').empty();
    $('#results_allAPAs_gLayer').empty();

    if (qaParameter) {
      $.ajax({
        contentType: 'application/json',
        method: 'GET',
        url: `/json/actions/qaParameterComparisonAcrossAPAs/${qaParameter}`,
        dataType: 'json',
        success: postSuccess_allAPAs,
      }).fail(postFail);
    }
  })

  $('#confirmButton_singleAPA').on('click', function () {
    $('#confirmButton_allAPAs').prop('disabled', true);
    $('#confirmButton_singleAPA').prop('disabled', true);

    $('#results_singleAPA').empty();
    $('#results_singleAPA').empty().append('<b>Working ...</b>');

    if (qaParameter && apaNumber) {
      if (results_allAPAs !== null) { postSuccess_singleAPA(results_allAPAs); }
      else {
        $.ajax({
          contentType: 'application/json',
          method: 'GET',
          url: `/json/actions/qaParameterComparisonAcrossAPAs/${qaParameter}`,
          dataType: 'json',
          success: postSuccess_singleAPA,
        }).fail(postFail);
      }
    }
  })
}


// Function to run for a successful comparison query across all APAs
function postSuccess_allAPAs(result) {
  // Make sure that the page elements where the results will be displayed are empty
  $('#results_singleAPA').empty();
  $('#results_allAPAs_xLayer').empty();
  $('#results_allAPAs_vLayer').empty();
  $('#results_allAPAs_uLayer').empty();
  $('#results_allAPAs_gLayer').empty();

  // Copy the returned results to a new (nested) array - they may be used for the 'singleAPA' comparison, which will therefore be faster if the already-existing results are simply reused
  results_allAPAs = JSON.parse(JSON.stringify(result));

  // Set up a title for the scatter plots based on the selected QA parameter
  let plotLabel = '';

  if ($('#qaParameterSelection').val() === 'winding_replacedWires') {
    plotLabel = 'Number of Replaced Wires';
  } else if ($('#qaParameterSelection').val() === 'winding_tensionAlarms') {
    plotLabel = 'Number of Tension Alarms';
  } else if ($('#qaParameterSelection').val() === 'soldering_reworkedSolders') {
    plotLabel = 'Number of Reworked Solders';
  } else if ($('#qaParameterSelection').val() === 'elecTest_leakingWires') {
    plotLabel = 'Number of Wires Failing Leakage Test';
  } else if ($('#qaParameterSelection').val() === 'nonConformanceReports') {
    plotLabel = 'Number of Non-Conformance Reports';
  }

  // Display the results
  // Create a set of Formio forms, populate each one with the appropriate data from the result object, and render them in the appropriate page elements
  Formio.createForm(document.getElementById('results_allAPAs_xLayer'), {
    components: [{
      type: 'NumberArray_ScatterPlot',
      label: `${plotLabel} on X Layer of each Assembled APA`,
      key: 'qaParameterResults_xLayer',
      input: true,
      disabled: true,
    }]
  }).then((form) => {
    form.submission = {
      data: { qaParameterResults_xLayer: result.xRawVals }
    };
  });

  Formio.createForm(document.getElementById('results_allAPAs_vLayer'), {
    components: [{
      type: 'NumberArray_ScatterPlot',
      label: `${plotLabel} on V Layer of each Assembled APA`,
      key: 'qaParameterResults_vLayer',
      input: true,
      disabled: true,
    }]
  }).then((form) => {
    form.submission = {
      data: { qaParameterResults_vLayer: result.vRawVals }
    };
  });

  Formio.createForm(document.getElementById('results_allAPAs_uLayer'), {
    components: [{
      type: 'NumberArray_ScatterPlot',
      label: `${plotLabel} on U Layer of each Assembled APA`,
      key: 'qaParameterResults_uLayer',
      input: true,
      disabled: true,
    }]
  }).then((form) => {
    form.submission = {
      data: { qaParameterResults_uLayer: result.uRawVals }
    };
  });

  Formio.createForm(document.getElementById('results_allAPAs_gLayer'), {
    components: [{
      type: 'NumberArray_ScatterPlot',
      label: `${plotLabel} on G Layer of each Assembled APA`,
      key: 'qaParameterResults_gLayer',
      input: true,
      disabled: true,
    }]
  }).then((form) => {
    form.submission = {
      data: { qaParameterResults_gLayer: result.gRawVals }
    };
  });

  // Re-enable both confirmation buttons for the next comparison
  $('#confirmButton_singleAPA').prop('disabled', false);
  $('#confirmButton_allAPAs').prop('disabled', false);
};


// Function to run for a successful comparison query on a single APA
function postSuccess_singleAPA(result) {
  // Make sure that the page elements where the 'single APA' results will be displayed are empty ...
  // ... but do not reset the 'all APA' results elements - it would be useful to keep those displayed
  $('#results_singleAPA').empty();

  // Display the results as a table of wire layer vs. QA parameter value
  let row1Title = '';
  let row2Title = '';
  let row3Title = '';

  if ($('#qaParameterSelection').val() === 'winding_replacedWires') {
    row1Title = `APA ${apaNumber}: Winder Number`;
    row2Title = `APA ${apaNumber}: Number of Replaced Wires`;
    row3Title = `APA ${apaNumber}: Percentage Replaced Wires`;
  } else if ($('#qaParameterSelection').val() === 'winding_tensionAlarms') {
    row1Title = `APA ${apaNumber}: Winder Number`;
    row2Title = `APA ${apaNumber}: Number of Tension Alarms`;
    row3Title = `[You Shouldn't See This!]`;
  } else if ($('#qaParameterSelection').val() === 'soldering_reworkedSolders') {
    row1Title = `APA ${apaNumber}: Winder Number`;
    row2Title = `APA ${apaNumber}: Number of Reworked Solders`;
    row3Title = `APA ${apaNumber}: Percentage Reworked Solders`;
  } else if ($('#qaParameterSelection').val() === 'elecTest_leakingWires') {
    row1Title = `APA ${apaNumber}: Winder Number`;
    row2Title = `APA ${apaNumber}: Number of Wires Failing Leakage Test`;
    row3Title = `APA ${apaNumber}: Percentage Wires Failing Leakage Test`;
  } else if ($('#qaParameterSelection').val() === 'nonConformanceReports') {
    row1Title = `[You Shouldn't See This!]`;
    row2Title = `APA ${apaNumber}: Number of Non-Conformance Reports`;
    row3Title = `[You Shouldn't See This!]`;
  }

  const tableStart = `
    <tr>
      <th style = 'width: 60%'>Parameter</th>
      <th style = 'width: 3%'></th>
      <th style = 'width: 9%'>X</th>
      <th style = 'width: 9%'>V</th>
      <th style = 'width: 9%'>U</th>
      <th style = 'width: 9%'>G</th>
    </tr>`;

  $('#results_singleAPA').append(tableStart);

  if (['winding_replacedWires', 'winding_tensionAlarms', 'soldering_reworkedSolders', 'elecTest_leakingWires'].includes($('#qaParameterSelection').val())) {
    const row1Content = `
      <tr>
        <td>${row1Title}</td>
        <td> </td>
        <td>${result.xWinders[apaNumber - 1]}</td>
        <td>${result.vWinders[apaNumber - 1]}</td>
        <td>${result.uWinders[apaNumber - 1]}</td>
        <td>${result.gWinders[apaNumber - 1]}</td>
      </tr>`;

    $('#results_singleAPA').append(row1Content);
  }

  const row2Content = `
    <tr>
      <td>${row2Title}</td>
      <td> </td>
      <td>${result.xRawVals[apaNumber - 1]}</td>
      <td>${result.vRawVals[apaNumber - 1]}</td>
      <td>${result.uRawVals[apaNumber - 1]}</td>
      <td>${result.gRawVals[apaNumber - 1]}</td>
    </tr>`;

  $('#results_singleAPA').append(row2Content);

  if (['winding_replacedWires', 'soldering_reworkedSolders', 'elecTest_leakingWires'].includes($('#qaParameterSelection').val())) {
    const row3Content = `
      <tr>
        <td>${row3Title}</td>
        <td> </td>
        <td>${result.xPercent[apaNumber - 1]}</td>
        <td>${result.vPercent[apaNumber - 1]}</td>
        <td>${result.uPercent[apaNumber - 1]}</td>
        <td>${result.gPercent[apaNumber - 1]}</td>
      </tr>`;

    $('#results_singleAPA').append(row3Content);
  }

  // Re-enable both confirmation buttons for the next comparison
  $('#confirmButton_singleAPA').prop('disabled', false);
  $('#confirmButton_allAPAs').prop('disabled', false);
};


// Function to run for a failed comparison query of either scenario
function postFail(result, statusCode, statusMsg) {
  // If the query result contains a response message, display it, and if not, display any status message and error code instead
  if (result.responseText) {
    console.log('POSTFAIL: ', result.responseText);
  } else {
    console.log('POSTFAIL: ', `${statusMsg} (${statusCode})`);
  }

  // Re-enable both confirmation buttons for the next search
  $('#confirmButton_singleAPA').prop('disabled', false);
  $('#confirmButton_allAPAs').prop('disabled', false);
};
