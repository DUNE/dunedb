// Main function for drawing and correctly displaying a QR code canvas
$(function () {
  DrawQRCode();
  ResizeQRText();
  $(window).resize(ResizeQRText);
})


// Function for drawing (or redrawing) a single QR code canvas
// This makes use of functions in the (externally developed) '/app/static/js/qrcodegen.js' library - please see that file for more details
function DrawQRCode() {
  // Each individual QR code points to a web address of the following form: [base_url]/c/[short_uuid]
  // where:  [base_url]   = http://localhost:12313 for all development deployments
  //                      = https://apa-staging.dunedb.org for the staging deployment
  //                      = https://apa.dunedb.org/ for the production deployments
  //         [short_uuid] = the 20 to 22 character long short component UUID
  // QR codes DO NOT use the full (36 character long) component UUID

  // Set up one or more canvases onto which to (re)draw QR codes
  canvases = $('canvas.qr-code');

  // For each canvas being (re)drawn ...
  $(canvases).each(function () {
    // Retrieve the canvas, as well as the text to write on each side of the QR code
    // This text will always be the full web address that the QR code is to point to
    const canvas = this;
    const text = $(canvas).data('qr-text');

    // Generate the QR code segments representing the 'text' string
    const segs = qrcodegen.QrSegment.makeSegments(text);

    // Set the error correction level 
    const ecl = qrcodegen.QrCode.Ecc.HIGH;

    // Create the overall QR code using the segments and error correction level
    const qr = qrcodegen.QrCode.encodeSegments(segs, ecl);

    // Set up some canvas parameters
    const scale = 8;
    const border = 0;

    // Draw the QR code onto the canvas, with the provided canvas parameters
    qr.drawCanvas(scale, border, canvas);
  })
};


// Function for resizing the displayed QR code canvas text based on the window size
function ResizeQRText() {
  $('div.qr').each(function () {
    $(this).css('font-size', 15 * $(this).width() / 500);
  })
}
