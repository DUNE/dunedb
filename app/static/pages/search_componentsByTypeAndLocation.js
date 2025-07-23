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

  // Make sure that the page element where the results will be displayed is empty, and then enter an initial message to display
  $('#results').empty();

  const resultsStart = `
    <tr>
      <td colspan = "3">The following <b>${$('#typeSelection option:selected').text()}</b> components are at <b>${$('#locationSelection option:selected').text()}</b>.</td>
    </tr>
    <tr>
      <td colspan = "3">Geometry Boards and Grounding Mesh Panels are grouped by part number, and then ordered by increasing type record number within each group.
        <br>
        Other component types are ungrouped, but still ordered by increasing type record number.
        <br>
        <hr>
      </td>
    </tr>`;

  $('#results').append(resultsStart);

  // If there are no search results, display a message to indicate this, but otherwise set up a table of the search results (with the layout being specific to the selected component type)
  if (Object.keys(result).length === 0) {
    $('#results').append('<b>There are no components of this type at the specified location with the specified options</b>');
  } else {
    if ($('#typeSelection option:selected').val() === 'GeometryBoard') {
      for (const boardGroup of result) {
        const groupCount = `
          <tr>
            <td colspan = "3">Found ${boardGroup.componentUuids.length} boards with part number <b>${boardGroup.partNumber} (${boardGroup.partString})</b></td>
          </tr>`;

        $('#results').append(groupCount);
      }

      $('#results').append('<br>');

      for (const boardGroup of result) {
        const groupTitle = `
          <tr>
            <td colspan = "3"><b>Part Number: ${boardGroup.partNumber}  (${boardGroup.partString})</b></td>
          </tr>`;

        $('#results').append(groupTitle);

        const tableStart = `
          <tr>
            <th scope = 'col' style = 'width: 25%'>Board UKID</th>
            <th scope = 'col' style = 'width: 25%'>Date at Location</th>
            <th scope = 'col' style = 'width: 50%'>Installed on APA</th>
          </tr>`;

        $('#results').append(tableStart);

        for (const i in boardGroup.componentUuids) {
          const boardText = `
            <tr>
              <td><a href = '/component/${boardGroup.componentUuids[i]}' target = '_blank'</a>${boardGroup.ukids[i]}</td>
              <td>${boardGroup.receptionDates[i]}</td>
              <td>${boardGroup.installedOnAPA[i]}</td>
            </tr>`;

          $('#results').append(boardText);
        }

        $('#results').append('<br>');
      }
    } else if ($('#typeSelection option:selected').val() === 'GroundingMeshPanel') {
      for (const meshGroup of result) {
        const groupCount = `
          <tr>
            <td colspan = "3">Found ${meshGroup.componentUuids.length} meshes with part number <b>${partNumbersDictionary[meshGroup.partNumber]}</b></td>
          </tr>`;

        $('#results').append(groupCount);
      }

      $('#results').append('<br>');

      for (const meshGroup of result) {
        const groupTitle = `
          <tr>
            <td colspan = "3"><b>Part Number: ${partNumbersDictionary[meshGroup.partNumber]}</b></td>
          </tr>`;

        $('#results').append(groupTitle);

        const tableStart = `
          <tr>
            <th scope = 'col' width = '25%'>Mesh Number</th>
            <th scope = 'col' width = '25%'>Date at Location</th>
            <th scope = 'col' width = '50%'>Installed on APA</th>
          </tr>`;

        $('#results').append(tableStart);

        for (const i in meshGroup.componentUuids) {
          const meshText = `
            <tr>
              <td><a href = '/component/${meshGroup.componentUuids[i]}' target = '_blank'</a>${meshGroup.dunePids[i].split('-')[1]}</td>
              <td>${meshGroup.receptionDates[i]}</td>
              <td>${meshGroup.installedOnAPA[i]}</td>
            </tr>`;

          $('#results').append(meshText);
        }

        $('#results').append('<br>');
      }
    } else if (['CableHarness', 'CEAdapterBoard', 'CRBoard', 'GBiasBoard', 'SHVBoard'].includes($('#typeSelection option:selected').val())) {
      const resultsStart = `
        <tr>
          <td colspan = "3">Found ${result.length} components with matching criteria</td>
        </tr>`;

      $('#results').append(resultsStart);
      $('#results').append('<br>');

      const tableStart = `
        <tr>
          <th scope = 'col' width = '25%'>Type Record Number</th>
          <th scope = 'col' width = '25%'>Date at Location</th>
          <th scope = 'col' width = '50%'>QA Checks Passed</th>
        </tr>`;

      $('#results').append(tableStart);

      for (const component of result) {
        const componentText = `
        <tr>
          <td><a href = '/component/${component.componentUuid}' target = '_blank'</a>${component.typeRecordNumber}</td>
          <td>${component.receptionDate}</td>
          <td>${component.qaChecksPassed}</td>
        </tr>`;

        $('#results').append(componentText);
      }
    } else {
      const tableStart = `
        <tr>
          <th scope = 'col' width = '50%'>Type Record Number</th>
          <th scope = 'col' width = '50%'>Date at Location</th>
        </tr>`;

      $('#results').append(tableStart);

      for (const component of result) {
        const componentText = `
        <tr>
          <td><a href = '/component/${component.componentUuid}' target = '_blank'</a>${component.typeRecordNumber}</td>
          <td>${component.receptionDate}</td>
        </tr>`;

        $('#results').append(componentText);
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
