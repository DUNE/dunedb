$(function(){
	$("span.qrurl").first().each(function(){
		var text = $(this).text();
		if(text) {
			console.log(text);
			var segs = qrcodegen.QrSegment.makeSegments(text);
			var ecl = qrcodegen.QrCode.Ecc.HIGH;
			var qr = qrcodegen.QrCode.encodeSegments(segs, ecl, 1, 40, -1, true);
			var scale = 8; // pixels per module
			var border = 4; // modules
			var canvas = document.getElementById("qrcode-canvas");
			// var svg = document.getElementById("qrcode-svg");
			// canvas.style.display = "none";
			// svg.style.display = "none";

			qr.drawCanvas(scale, border, canvas);
			canvas.style.removeProperty("display");
		}

	});
})