// Declare variables to hold the user-specified parameters
let typeFormID = null;
let firstTypeRecordNumber = null;
let lastTypeRecordNumber = null;

// Run a specific function when the page is loaded
window.addEventListener('load', renderInputForms);


// Function to run when the page is loaded
async function renderInputForms() {
  // Get and set the value of any input parameter that is changed
  $('#typeFormSelection').on('change', async function () {
    typeFormID = $('#typeFormSelection').val();
  });

  $('#firstTypeRecordNumberSelection').on('change', async function () {
    firstTypeRecordNumber = $('#firstTypeRecordNumberSelection').val();
  });

  $('#lastTypeRecordNumberSelection').on('change', async function () {
    lastTypeRecordNumber = $('#lastTypeRecordNumberSelection').val();
  });

  // When the confirmation button is pressed, redirect the user to the page for viewing QR codes in bulk based on the user inputs
  $('#confirmButton').on('click', function () {

    if (typeFormID && firstTypeRecordNumber && lastTypeRecordNumber) {
      window.location.href = `/components/bulkQRCodes/${typeFormID}/${firstTypeRecordNumber}/${lastTypeRecordNumber}`;
    }
  });
}
