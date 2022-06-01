
// Main function for generating and displaying a QR code canvas
$(function() {
  DrawQRCode();
  ResizeQRText();
  $( window ).resize(ResizeQRText);
})

// Resize the displayed QR code canvas text based on the window size
function ResizeQRText() {
  $('div.qr').each(function() {
    $(this).css('font-size', 15 * $(this).width() / 500);
  })
}

// Draw (or redraw) a single QR code canvas
function DrawQRCode() {
  
  // Each individual QR code points to a web address like the following: [base_url]/c/[short_uuid]
  // where:  [base_url]   = http://localhost:12313 for development deployments, or https://apa.dunedb.org for the production deployment
  //         [short_uuid] = the 22 character-length short component UUID
  // QR codes DO NOT use the full (36 character-length) component UUID
  
  // Set up one or more canvases onto which to (re)draw QR codes
  canvases = $("canvas.qr-code");
  
  // For each canvas being (re)drawn ...
  $(canvases).each(function() {
    
    // Retrieve the canvas, as well as the text and description to write on each side of the QR code
    // The 'text' will always be the full web address that the QR code is to point to
    // The 'desc' will always be the component name
    var canvas = this;
    var text = $(canvas).data('qr-text');
    var desc = $(canvas).data('qr-desc');
    
    // Generate the QR code segments representing the 'text' string
    var segs = qrcodegen.QrSegment.makeSegments(text);
    
    // Set the error correction level 
    var ecl = qrcodegen.QrCode.Ecc.HIGH;
    
    // Create the overall QR code using the segments and error correction level
    var qr = qrcodegen.QrCode.encodeSegments(segs, ecl);
    
    // Set up some canvas parameters
    var scale  = 8;
    var border = 0;
    
    // Draw the QR code onto the canvas, with the provided canvas parameters
    qr.drawCanvas(scale, border, canvas);
  })
};

