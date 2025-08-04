// Declare variables to hold the user-specified search parameters
let componentType = null;
let componentLocation = null;
let acceptanceStatus = 'any';
let toothStripStatus = 'any';
let conformanceStatus = 'any';
let qaChecksStatus = 'any';

// Run a specific function when the page is loaded
window.addEventListener('load', renderSearchForms);


// Function to run when the page is loaded
async function renderSearchForms() {
  // Get and set the value of any search parameter that is changed
  $('#typeSelection').on('change', async function () {
    componentType = $('#typeSelection').val();
  });

  $('#locationSelection').on('change', async function () {
    componentLocation = $('#locationSelection').val();
  });

  $('#acceptanceStatusSelection').on('change', async function () {
    acceptanceStatus = $('#acceptanceStatusSelection').val();
  });

  $('#toothStripStatusSelection').on('change', async function () {
    toothStripStatus = $('#toothStripStatusSelection').val();
  });

  $('#conformanceStatusSelection').on('change', async function () {
    conformanceStatus = $('#conformanceStatusSelection').val();
  });

  $('#qaChecksStatusSelection').on('change', async function () {
    qaChecksStatus = $('#qaChecksStatusSelection').val();
  });

  // When the confirmation button is pressed, perform the search using the appropriate jQuery 'ajax' call and the current values of the search parameters
  // Additionally, disable the button while the current search is being performed
  $('#confirmButton').on('click', function () {
    $('#confirmButton').prop('disabled', true);
    $('#summary1').empty().append('<b>Working ...</b>');
    $('#summary2').empty();
    $('#summary3').empty();
    $('#results1').empty();
    $('#results2').empty();
    $('#results3').empty();

    if (componentType && componentLocation) {
      $.ajax({
        contentType: 'application/json',
        method: 'GET',
        url: `/json/search/componentsByTypeAndLocation/${componentType}/${componentLocation}/${acceptanceStatus}/${toothStripStatus}/${conformanceStatus}/${qaChecksStatus}`,
        dataType: 'json',
        success: postSuccess,
      }).fail(postFail);
    }
  });
}


// Function to run for a successful search query
function postSuccess(result) {
  // Set up a dictionary containing the grounding mesh panel part number [key, string] pairs (taken directly from the 'Grounding Mesh Panel' component type form)
  const partNumbersDictionary = {
    mesh29410560HeadEndLH: '294-10560 HEAD END - L/H',
    mesh29410561HeadEndRH: '294-10561 HEAD END - R/H',
    mesh29410562FootEndRH: '294-10562 FOOT END - R/H',
    mesh29410563FootEndLH: '294-10563 FOOT END - L/H',
    mesh29410564Centre: '294-10564 CENTRE',
  };

  // Make sure that the page elements where the results will be displayed are all empty
  $('#summary1').empty();
  $('#summary2').empty();
  $('#summary3').empty();
  $('#results1').empty();
  $('#results2').empty();
  $('#results3').empty();

  // If there are no search results, display a message to indicate this
  // Otherwise, set up an initial message to display (dependent on the selected component type), and a table of the search results (with the layout being specific to the selected component type)
  if (Object.keys(result).length === 0) {
    $('#summary1').append('<b>There are no components of this type at the specified location with the specified optional filters</b>');
  } else {
    if ($('#typeSelection option:selected').val() === 'GeometryBoard') {
      for (const boardGroup of result.slice(0, (result.length / 3) + 1)) {
        const groupCount = `
          <tr>
            <td colspan = "3"><b>P/N: ${boardGroup.partNumber} (${boardGroup.partString})</b> - ${boardGroup.componentUuids.length} boards</td>
          </tr>`;

        $('#summary1').append(groupCount);
      }

      $('#summary1').append('<br>');

      for (const boardGroup of result.slice((result.length / 3) + 1, (2 * (result.length / 3)) + 1)) {
        const groupCount = `
          <tr>
            <td colspan = "3"><b>P/N: ${boardGroup.partNumber} (${boardGroup.partString})</b> - ${boardGroup.componentUuids.length} boards</td>
          </tr>`;

        $('#summary2').append(groupCount);
      }

      $('#summary2').append('<br>');

      for (const boardGroup of result.slice((2 * (result.length / 3)) + 1, result.length)) {
        const groupCount = `
          <tr>
            <td colspan = "3"><b>P/N: ${boardGroup.partNumber} (${boardGroup.partString})</b> - ${boardGroup.componentUuids.length} boards</td>
          </tr>`;

        $('#summary3').append(groupCount);
      }

      $('#summary3').append('<br>');

      const tableStart = `
        <tr>
          <th scope = 'col' style = 'width: 23%'>UKID</th>
          <th scope = 'col' style = 'width: 32%'>Date at Location</th>
          <th scope = 'col' style = 'width: 45%'>Installed on APA</th>
        </tr>`;

      for (const boardGroup of result.slice(0, (result.length / 3) + 1)) {
        const groupTitle = `
          <tr>
            <td colspan = "3"><b>P/N: ${boardGroup.partNumber} (${boardGroup.partString})</b></td>
          </tr>`;

        $('#results1').append(groupTitle);
        $('#results1').append(tableStart);

        for (const i in boardGroup.componentUuids) {
          const boardText = `
            <tr>
              <td><a href = '/component/${boardGroup.componentUuids[i]}' target = '_blank'</a>${boardGroup.ukids[i]}</td>
              <td>${boardGroup.receptionDates[i]}</td>
              <td>${boardGroup.installedOnAPA[i]}</td>
            </tr>`;

          $('#results1').append(boardText);
        }

        $('#results1').append('<br>');
      }

      for (const boardGroup of result.slice((result.length / 3) + 1, (2 * (result.length / 3)) + 1)) {
        const groupTitle = `
          <tr>
            <td colspan = "3"><b>P/N: ${boardGroup.partNumber} (${boardGroup.partString})</b></td>
          </tr>`;

        $('#results2').append(groupTitle);
        $('#results2').append(tableStart);

        for (const i in boardGroup.componentUuids) {
          const boardText = `
            <tr>
              <td><a href = '/component/${boardGroup.componentUuids[i]}' target = '_blank'</a>${boardGroup.ukids[i]}</td>
              <td>${boardGroup.receptionDates[i]}</td>
              <td>${boardGroup.installedOnAPA[i]}</td>
            </tr>`;

          $('#results2').append(boardText);
        }

        $('#results2').append('<br>');
      }

      for (const boardGroup of result.slice((2 * (result.length / 3)) + 1, result.length)) {
        const groupTitle = `
          <tr>
            <td colspan = "3"><b>P/N: ${boardGroup.partNumber} (${boardGroup.partString})</b></td>
          </tr>`;

        $('#results3').append(groupTitle);
        $('#results3').append(tableStart);

        for (const i in boardGroup.componentUuids) {
          const boardText = `
            <tr>
              <td><a href = '/component/${boardGroup.componentUuids[i]}' target = '_blank'</a>${boardGroup.ukids[i]}</td>
              <td>${boardGroup.receptionDates[i]}</td>
              <td>${boardGroup.installedOnAPA[i]}</td>
            </tr>`;

          $('#results3').append(boardText);
        }

        $('#results3').append('<br>');
      }
    } else if ($('#typeSelection option:selected').val() === 'GroundingMeshPanel') {
      for (const meshGroup of result.slice(0, (result.length / 3) + 1)) {
        const groupCount = `
          <tr>
            <td colspan = "3"><b>P/N: ${partNumbersDictionary[meshGroup.partNumber]}</b> - ${meshGroup.componentUuids.length} mesh panels</td>
          </tr>`;

        $('#summary1').append(groupCount);
      }

      $('#summary1').append('<br>');

      for (const meshGroup of result.slice((result.length / 3) + 1, (2 * (result.length / 3)) + 1)) {
        const groupCount = `
          <tr>
            <td colspan = "3"><b>P/N: ${partNumbersDictionary[meshGroup.partNumber]}</b> - ${meshGroup.componentUuids.length} mesh panels</td>
          </tr>`;

        $('#summary2').append(groupCount);
      }

      $('#summary2').append('<br>');

      for (const meshGroup of result.slice((2 * (result.length / 3)) + 1, result.length)) {
        const groupCount = `
          <tr>
            <td colspan = "3"><b>P/N: ${partNumbersDictionary[meshGroup.partNumber]}</b> - ${meshGroup.componentUuids.length} mesh panels</td>
          </tr>`;

        $('#summary3').append(groupCount);
      }

      $('#summary3').append('<br>');

      const tableStart = `
        <tr>
          <th scope = 'col' width = '23%'>Number</th>
          <th scope = 'col' width = '32%'>Date at Location</th>
          <th scope = 'col' width = '45%'>Installed on APA</th>
        </tr>`;

      for (const meshGroup of result.slice(0, (result.length / 3) + 1)) {
        const groupTitle = `
          <tr>
            <td colspan = "3"><b>P/N: ${partNumbersDictionary[meshGroup.partNumber]}</b></td>
          </tr>`;

        $('#results1').append(groupTitle);
        $('#results1').append(tableStart);

        for (const i in meshGroup.componentUuids) {
          const meshText = `
            <tr>
              <td><a href = '/component/${meshGroup.componentUuids[i]}' target = '_blank'</a>${meshGroup.dunePids[i].split('-')[1]}</td>
              <td>${meshGroup.receptionDates[i]}</td>
              <td>${meshGroup.installedOnAPA[i]}</td>
            </tr>`;

          $('#results1').append(meshText);
        }

        $('#results1').append('<br>');
      }

      for (const meshGroup of result.slice((result.length / 3) + 1, (2 * (result.length / 3)) + 1)) {
        const groupTitle = `
          <tr>
            <td colspan = "3"><b>P/N: ${partNumbersDictionary[meshGroup.partNumber]}</b></td>
          </tr>`;

        $('#results2').append(groupTitle);
        $('#results2').append(tableStart);

        for (const i in meshGroup.componentUuids) {
          const meshText = `
            <tr>
              <td><a href = '/component/${meshGroup.componentUuids[i]}' target = '_blank'</a>${meshGroup.dunePids[i].split('-')[1]}</td>
              <td>${meshGroup.receptionDates[i]}</td>
              <td>${meshGroup.installedOnAPA[i]}</td>
            </tr>`;

          $('#results2').append(meshText);
        }

        $('#results2').append('<br>');
      }

      for (const meshGroup of result.slice((2 * (result.length / 3)) + 1, result.length)) {
        const groupTitle = `
          <tr>
            <td colspan = "3"><b>P/N: ${partNumbersDictionary[meshGroup.partNumber]}</b></td>
          </tr>`;

        $('#results3').append(groupTitle);
        $('#results3').append(tableStart);

        for (const i in meshGroup.componentUuids) {
          const meshText = `
            <tr>
              <td><a href = '/component/${meshGroup.componentUuids[i]}' target = '_blank'</a>${meshGroup.dunePids[i].split('-')[1]}</td>
              <td>${meshGroup.receptionDates[i]}</td>
              <td>${meshGroup.installedOnAPA[i]}</td>
            </tr>`;

          $('#results3').append(meshText);
        }

        $('#results3').append('<br>');
      }
    } else if (['CableHarness', 'CEAdapterBoard', 'CRBoard', 'GBiasBoard', 'SHVBoard'].includes($('#typeSelection option:selected').val())) {
      const resultsStart = `
        <tr>
          <td colspan = "3"><b>Type: ${$('#typeSelection option:selected').text()}</b> - ${result.length} components</td>
        </tr>`;

      $('#summary1').append(resultsStart);
      $('#summary1').append('<br>');

      const tableStart = `
        <tr>
          <th scope = 'col' width = '23%'>Number</th>
          <th scope = 'col' width = '32%'>Date at Location</th>
          <th scope = 'col' width = '45%'>QA Checks Passed</th>
        </tr>`;

      $('#results1').append(tableStart);

      for (const component of result.slice(0, (result.length / 3) + 1)) {
        const componentText = `
        <tr>
          <td><a href = '/component/${component.componentUuid}' target = '_blank'</a>${component.typeRecordNumber}</td>
          <td>${component.receptionDate}</td>
          <td>${component.qaChecksPassed}</td>
        </tr>`;

        $('#results1').append(componentText);
      }

      $('#results2').append(tableStart);

      for (const component of result.slice((result.length / 3) + 1, (2 * (result.length / 3)) + 1)) {
        const componentText = `
        <tr>
          <td><a href = '/component/${component.componentUuid}' target = '_blank'</a>${component.typeRecordNumber}</td>
          <td>${component.receptionDate}</td>
          <td>${component.qaChecksPassed}</td>
        </tr>`;

        $('#results2').append(componentText);
      }

      $('#results3').append(tableStart);

      for (const component of result.slice((2 * (result.length / 3)) + 1, result.length)) {
        const componentText = `
        <tr>
          <td><a href = '/component/${component.componentUuid}' target = '_blank'</a>${component.typeRecordNumber}</td>
          <td>${component.receptionDate}</td>
          <td>${component.qaChecksPassed}</td>
        </tr>`;

        $('#results3').append(componentText);
      }
    } else {
      const resultsStart = `
        <tr>
          <td colspan = "3"><b>Type: ${$('#typeSelection option:selected').text()}</b> - ${result.length} components</td>
        </tr>`;

      $('#summary1').append(resultsStart);
      $('#summary1').append('<br>');

      const tableStart = `
        <tr>
          <th scope = 'col' width = '23%'>Number</th>
          <th scope = 'col' width = '32%'>Date at Location</th>
          <th scope = 'col' width = '45%'></th>
        </tr>`;

      $('#results1').append(tableStart);

      for (const component of result.slice(0, (result.length / 3) + 1)) {
        const componentText = `
        <tr>
          <td><a href = '/component/${component.componentUuid}' target = '_blank'</a>${component.typeRecordNumber}</td>
          <td>${component.receptionDate}</td>
          <td></td>
        </tr>`;

        $('#results1').append(componentText);
      }

      $('#results2').append(tableStart);

      for (const component of result.slice((result.length / 3) + 1, (2 * (result.length / 3)) + 1)) {
        const componentText = `
        <tr>
          <td><a href = '/component/${component.componentUuid}' target = '_blank'</a>${component.typeRecordNumber}</td>
          <td>${component.receptionDate}</td>
          <td></td>
        </tr>`;

        $('#results2').append(componentText);
      }

      $('#results3').append(tableStart);

      for (const component of result.slice((2 * (result.length / 3)) + 1, result.length)) {
        const componentText = `
        <tr>
          <td><a href = '/component/${component.componentUuid}' target = '_blank'</a>${component.typeRecordNumber}</td>
          <td>${component.receptionDate}</td>
          <td></td>
        </tr>`;

        $('#results3').append(componentText);
      }
    }
  }

  // Re-enable the confirmation button for the next search
  $('#confirmButton').prop('disabled', false);
};


// Function to run for a failed search query
function postFail(result, statusCode, statusMsg) {
  // If the query result contains a response message, display it, and if not, display any status message and error code instead
  if (result.responseText) {
    console.log('POSTFAIL: ', result.responseText);
  } else {
    console.log('POSTFAIL: ', `${statusMsg} (${statusCode})`);
  }

  // Re-enable the confirmation button for the next search
  $('#confirmButton').prop('disabled', false);
};
