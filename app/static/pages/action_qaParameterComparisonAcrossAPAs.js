// Declare variables to hold the user-specified comparison parameters
let qaParameter = null;
let apaNumber = null;

// Set up an overall results object, to hold the results from each potential QA parameter
// Once each parameter's results are stored, they can be reused until the interface page is reloaded (i.e. they don't have to be retrieved every single time the same QA parameter is re-selected)
let results_allAPAs = {
  winding_replacedWires: null,
  winding_tensionAlarms: null,
  soldering_reworkedSolders: null,
  elecTest_leakingWires: null,
  nonConformanceReports: null,
}

// Run a specific function when the page is loaded
window.addEventListener('load', renderComparisonForms);


// Function to run when the page is loaded
async function renderComparisonForms() {
  // When the 'Perform Comparison (All APAs)' confirmation button is pressed ...
  $('#confirmButton_allAPAs').on('click', function () {
    // Disable both confirmation buttons while the comparison is being performed
    $('#confirmButton_allAPAs').prop('disabled', true);
    $('#confirmButton_singleAPA').prop('disabled', true);

    // Retrieve the currently selected QA parameter
    qaParameter = $('#qaParameterSelection').val();

    // If there are no existing 'All APAs' results for this QA parameter ...
    // ... clear any previously displayed results (for both 'All APAs' and 'Single APA' comparisons) from the corresponding page elements
    // ... retrieve the 'All APAs' results by performing the comparison using the appropriate jQuery 'ajax' call
    // ... use the 'postSuccess' function to display the newly-retrieved results
    // On the other hand, if there are already 'All APAs' results available for this QA parameter ...
    // ... skip directly to the 'postSuccess' function to display the existing results
    if (results_allAPAs[qaParameter] === null) {
      $('#results_singleAPA').empty();
      $('#results_allAPAs_xLayer').empty().append('<b>Working ...</b>');
      $('#results_allAPAs_vLayer').empty();
      $('#results_allAPAs_uLayer').empty();
      $('#results_allAPAs_gLayer').empty();

      $.ajax({
        contentType: 'application/json',
        method: 'GET',
        url: `/json/actions/qaParameterComparisonAcrossAPAs/${qaParameter}`,
        dataType: 'json',
        success: postSuccess_allAPAs,
      }).fail(postFail);
    } else {
      postSuccess_allAPAs(results_allAPAs[qaParameter]);
    }
  })

  // When the 'Perform Comparison (Single APA)' confirmation button is pressed ...
  $('#confirmButton_singleAPA').on('click', function () {
    // Disable both confirmation buttons while the comparison is being performed
    $('#confirmButton_allAPAs').prop('disabled', true);
    $('#confirmButton_singleAPA').prop('disabled', true);

    // Retrieve the currently selected QA parameter
    qaParameter = $('#qaParameterSelection').val();

    // Check if there are 'All APAs' results available for this QA parameter
    // If there are no results available, prompt the user to first perform the 'All APAs' comparison to retrieve them
    // If there are results available, clear any previously displayed 'Single APA' results from the corresponding page element, then retrieve and display the currently selected APA's results
    if (results_allAPAs[qaParameter] === null) {
      $('#results_singleAPA').empty();
      $('#results_singleAPA').empty().append('<b>Please first perform the \'All APAs\' comparison for this QA parameter!</b>');
    } else {
      $('#results_singleAPA').empty();

      apaNumber = $('#apaNumberSelection').val();

      let row1Title = '';
      let row2Title = '';
      let row3Title = '';

      if (qaParameter === 'winding_replacedWires') {
        row1Title = `APA ${apaNumber}: Winder Number`;
        row2Title = `APA ${apaNumber}: Number of Replaced Wires`;
        row3Title = `APA ${apaNumber}: Percentage Replaced Wires`;
      } else if (qaParameter === 'winding_tensionAlarms') {
        row1Title = `APA ${apaNumber}: Winder Number`;
        row2Title = `APA ${apaNumber}: Number of Tension Alarms`;
        row3Title = `[You Shouldn't See This!]`;
      } else if (qaParameter === 'soldering_reworkedSolders') {
        row1Title = `APA ${apaNumber}: Winder Number`;
        row2Title = `APA ${apaNumber}: Number of Reworked Solders`;
        row3Title = `APA ${apaNumber}: Percentage Reworked Solders`;
      } else if (qaParameter === 'elecTest_leakingWires') {
        row1Title = `APA ${apaNumber}: Winder Number`;
        row2Title = `APA ${apaNumber}: Number of Wires Failing Leakage Test`;
        row3Title = `APA ${apaNumber}: Percentage Wires Failing Leakage Test`;
      } else if (qaParameter === 'nonConformanceReports') {
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

      if (['winding_replacedWires', 'winding_tensionAlarms', 'soldering_reworkedSolders', 'elecTest_leakingWires'].includes(qaParameter)) {
        const row1Content = `
          <tr>
            <td>${row1Title}</td>
            <td> </td>
            <td>${results_allAPAs[qaParameter].xWinders[apaNumber - 1]}</td>
            <td>${results_allAPAs[qaParameter].vWinders[apaNumber - 1]}</td>
            <td>${results_allAPAs[qaParameter].uWinders[apaNumber - 1]}</td>
            <td>${results_allAPAs[qaParameter].gWinders[apaNumber - 1]}</td>
          </tr>`;

        $('#results_singleAPA').append(row1Content);
      }

      const row2Content = `
        <tr>
          <td>${row2Title}</td>
          <td> </td>
          <td>${results_allAPAs[qaParameter].xRawVals[apaNumber - 1]}</td>
          <td>${results_allAPAs[qaParameter].vRawVals[apaNumber - 1]}</td>
          <td>${results_allAPAs[qaParameter].uRawVals[apaNumber - 1]}</td>
          <td>${results_allAPAs[qaParameter].gRawVals[apaNumber - 1]}</td>
        </tr>`;

      $('#results_singleAPA').append(row2Content);

      if (['winding_replacedWires', 'soldering_reworkedSolders', 'elecTest_leakingWires'].includes(qaParameter)) {
        const row3Content = `
          <tr>
            <td>${row3Title}</td>
            <td> </td>
            <td>${results_allAPAs[qaParameter].xPercent[apaNumber - 1]}</td>
            <td>${results_allAPAs[qaParameter].vPercent[apaNumber - 1]}</td>
            <td>${results_allAPAs[qaParameter].uPercent[apaNumber - 1]}</td>
            <td>${results_allAPAs[qaParameter].gPercent[apaNumber - 1]}</td>
          </tr>`;

        $('#results_singleAPA').append(row3Content);
      }
    }

    // Re-enable both confirmation buttons once the comparison is finished
    $('#confirmButton_singleAPA').prop('disabled', false);
    $('#confirmButton_allAPAs').prop('disabled', false);
  })
}


// Function to run for a successful comparison query across all APAs
function postSuccess_allAPAs(result) {
  // Clear any previously displayed 'All APAs' results from the corresponding page elements
  $('#results_singleAPA').empty();
  $('#results_allAPAs_xLayer').empty();
  $('#results_allAPAs_vLayer').empty();
  $('#results_allAPAs_uLayer').empty();
  $('#results_allAPAs_gLayer').empty();

  // Copy the returned results to the corresponding entry in the overall results object ... they can be reused, to avoid having to retrieve them all over again
  results_allAPAs[qaParameter] = JSON.parse(JSON.stringify(result));

  // Set up a title for the scatter plots based on the selected QA parameter
  let plotLabel = '';

  if (qaParameter === 'winding_replacedWires') {
    plotLabel = 'Number of Replaced Wires';
  } else if (qaParameter === 'winding_tensionAlarms') {
    plotLabel = 'Number of Tension Alarms';
  } else if (qaParameter === 'soldering_reworkedSolders') {
    plotLabel = 'Number of Reworked Solders';
  } else if (qaParameter === 'elecTest_leakingWires') {
    plotLabel = 'Number of Wires Failing Leakage Test';
  } else if (qaParameter === 'nonConformanceReports') {
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

  // Re-enable both confirmation buttons once the comparison is finished
  $('#confirmButton_singleAPA').prop('disabled', false);
  $('#confirmButton_allAPAs').prop('disabled', false);
};


// Function to run for a failed comparison query across all APAs
function postFail(result, statusCode, statusMsg) {
  // If the query result contains a response message, display it, and if not, display any status message and error code instead
  if (result.responseText) {
    console.log('POSTFAIL: ', result.responseText);
  } else {
    console.log('POSTFAIL: ', `${statusMsg} (${statusCode})`);
  }

  // Re-enable both confirmation buttons ready for the next comparison
  $('#confirmButton_singleAPA').prop('disabled', false);
  $('#confirmButton_allAPAs').prop('disabled', false);
};
