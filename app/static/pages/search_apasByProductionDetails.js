// Declare variables to hold the (initially empty) user-specified assembled APA production location and number
let apaLocation = null;
let apaNumber = null;


// Main function
$(function () {
  // When the selected APA production location is changed, get the newly selected location from the corresponding page element
  // If both user-specified search criteria are valid, then perform the search
  $('#locationSelection').on('change', async function () {
    apaLocation = $('#locationSelection').val();

    if (apaLocation && apaNumber) performSearch();
  });

  // When the entered APA production number is changed and the 'Enter' key is pressed, get the newly entered number from the corresponding page element
  // If both user-specified search criteria are valid, then perform the search
  document.getElementById('numberSelection').addEventListener('keyup', function (e) {
    if (e.key === 'Enter') {
      apaNumber = $('#numberSelection').val();

      if (apaLocation && apaNumber) performSearch();
    }
  });
});


// Function to perform the appropriate jQuery 'ajax' call to make the search
function performSearch() {
  $.ajax({
    contentType: 'application/json',
    method: 'GET',
    url: `/json/search/apasByProductionLocationAndNumber/${apaLocation}/${apaNumber}`,
    dataType: 'json',
    success: postSuccess,
  }).fail(postFail);
}


// Function to run for a successful search query
function postSuccess(result) {
  // Make sure that the page element where any information messages will be displayed is empty
  $('#results').empty();

  // If there are no search results, display a message to indicate this
  // Similarly, if there is more than one search result (i.e. more than one assembled APA matches the provided record details), also display a message
  // Otherwise (i.e. there is exactly one assembled APA in the search results), redirect the user to the page for viewing the assembled APA component record
  if (result.length === 0) {
    $('#results').append('<b>There is no assembled APA matching the specified record details.</b>');
  } else if (result.length > 1) {
    const output = `
      <b>The specified record details match <u>multiple</u> assembled APAs.</b>
      <br>This should not happen, since these two pieces of information should uniquely identify a single APA.
      <br>Please bring this to the attention of one of the database development team, indicating the APA record details that you specified on the left.`;

    $('#results').append(output);
  } else {
    window.location.href = `/component/${result[0].componentUuid}`;
  }
};


// Function to run for a failed search query
function postFail(result, statusCode, statusMsg) {
  // If the query result contains a response message, display it, and if not, display any status message and error code instead
  if (result.responseText) {
    console.log('POSTFAIL: ', result.responseText);
  } else {
    console.log('POSTFAIL: ', `${statusMsg} (${statusCode})`);
  }
};
