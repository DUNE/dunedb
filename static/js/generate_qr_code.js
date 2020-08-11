$(function(){
  DrawQRCodes();
  $('#qr-error-safe').on("change",DrawQRCodes);
  ResizeQrText();
  $( window ).resize(ResizeQrText);

})
 

function ResizeQrText() {
    $('div.qr').each(function(){
      $(this).css('font-size',15*$(this).width()/500);
     })
}
// This function to redraw all QR canvases.
function DrawQRCodes(){
  // lowres = false means lots of error correction, 
  // lowres = true means low-res, easier to see
  var lowres = $('#qr-error-safe').is(":not(:checked)");
  var short = true;
  canvases = $("canvas.qr-code");

  // newer version: no text in canvas, use CSS to do that instead.
  console.log("DrawQRCode",...arguments);
  $(canvases).each(function(){
      var canvas = this;
      var text = $(canvas).data('qr-text');
      var desc = $(canvas).data('qr-desc');

      // if using short code, then reformat the text for the QR.
      if(short) {
        var regex_match = text.match(/(([A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12}))/);
        if(regex_match && regex_match[0]) {
          var uuid = regex_match[0];
          // this uses base58 encoding, which usually will yield 21 to 22 characters.
          var short_uuid = ShortUUID().fromUUID(uuid);
          // pad the short code to 22 characters, to ensure matching.
          var padded = short_uuid.padEnd(22,'-'); 
          text = text.substr(0,regex_match.index) + short_uuid + text.substr(regex_match.index+regex_match[0].length);

        } else {
          // Whaaaaat?
          console.error('couldnt find the UUID')
        }

      }
      console.log("Drawing QR code",text,desc,lowres);

      var segs = qrcodegen.QrSegment.makeSegments(text);

      var ecl = qrcodegen.QrCode.Ecc.HIGH;
      var minVersion = 8; // 8; // Determines size, but adds correction bits.
     if(lowres){
        ecl = qrcodegen.QrCode.Ecc.LOW;
        minVersion = 1; // 8; // Determines size, but adds correction bits.
      }
      var qr = qrcodegen.QrCode.encodeSegments(segs, ecl, minVersion);
      gqr = qr;
      console.log(qr);
      var w = canvas.width;
      var scale = 8;//Math.Round(w/12*8);
      var border = 0; //w/12*4;

      var ctx = canvas.getContext("2d");
      qr.drawCanvas(scale, border, canvas);
  })


 //  // This is the older version that puts in the text in the canvas.
 //  console.log("DrawQRCode",...arguments);
	// $(canvases).each(function(){
	// 		var canvas = this;
 //      var text = $(canvas).data('qr-text');
 //      var desc = $(canvas).data('qr-desc');

	// 		var segs = qrcodegen.QrSegment.makeSegments(text);

	// 		var ecl = qrcodegen.QrCode.Ecc.HIGH;
 //      var minVersion = 8; // 8; // Determines size, but adds correction bits.

 //      console.log("Drawing QR code",text,desc,lowres);

 //     if(lowres){
 //        ecl = qrcodegen.QrCode.Ecc.LOW;
	//   		minVersion = 1; // 8; // Determines size, but adds correction bits.
 //      }
	// 		var qr = qrcodegen.QrCode.encodeSegments(segs, ecl, minVersion);
 //      gqr = qr;
	//     console.log(qr);
 //      var w = canvas.width;
 //      var scale = 12;//Math.Round(w/12*8);
 //      var border = 8; //w/12*4;

 //  	// 	var scale = 8; // pixels per module
	// 		// var border = 8;//4; // modules
	// 		// var svg = document.getElementById("qrcode-svg");
	// 		// canvas.style.display = "none";
	// 		// svg.style.display = "none";

	// 		var ctx = canvas.getContext("2d");
	// 		qr.drawCanvas(scale, border, canvas);
	// 		ctx.font = "16px Inconsolata";
	// 		ctx.fillStyle = "black";
	// 		var width = canvas.width;
	// 		var height = canvas.height;
	// 		ctx.save();
	// 		ctx.translate(width/2,height/2);

	// 		ctx.save();
	// 		ctx.translate(-width/2,-height/2);

 //        ctx.scale(width/520,width/520);
 //  			ctx.fillText(text,14,14);
 //  			if(desc) ctx.fillText(desc,14,31);

	// 		ctx.restore();

	// 		ctx.rotate(90*Math.PI/180.)
	// 		ctx.save();
	// 		ctx.translate(-width/2,-height/2);
 //        ctx.scale(width/520,width/520);
 //        ctx.fillText(text,14,14);
 //        if(desc) ctx.fillText(desc,14,31);
	// 		ctx.restore();

	// 		ctx.rotate(90*Math.PI/180.)
	// 		ctx.save();
	// 		ctx.translate(-width/2,-height/2);
 //        ctx.scale(width/520,width/520);
 //        ctx.fillText(text,14,14);
 //        if(desc) ctx.fillText(desc,14,31);
	// 		ctx.restore();

	// 		ctx.rotate(90*Math.PI/180.)
	// 		ctx.save();
	// 		ctx.translate(-width/2,-height/2);
 //        ctx.scale(width/520,width/520);
 //        ctx.fillText(text,14,14);
 //        if(desc) ctx.fillText(desc,14,31);
	// 		ctx.restore();

	// 		ctx.restore();
	// })

};

