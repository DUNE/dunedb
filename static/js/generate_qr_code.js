$(function(){
	$("span.qrurl").first().each(function(){
		var text = $(this).text();
		if(text) {
			console.log(text);
			var segs = qrcodegen.QrSegment.makeSegments(text);
			var ecl = qrcodegen.QrCode.Ecc.HIGH;
			var qr = qrcodegen.QrCode.encodeSegments(segs, ecl, 1, 40, -1, true);
			var scale = 8; // pixels per module
			var border = 8//4; // modules
			var canvas = document.getElementById("qrcode-canvas");
			// var svg = document.getElementById("qrcode-svg");
			// canvas.style.display = "none";
			// svg.style.display = "none";

			qr.drawCanvas(scale, border, canvas);
			var ctx = canvas.getContext("2d");
			ctx.font = "14px Inconsolada";
			ctx.fillStyle = "black";
			var width = canvas.width;
			var height = canvas.height;
			ctx.save();
			ctx.translate(width/2,height/2);

			ctx.save();
			ctx.translate(-width/2,-height/2);
			ctx.fillText(text,14,14);
			ctx.restore();

			ctx.rotate(90*Math.PI/180.)
			ctx.save();
			ctx.translate(-width/2,-height/2);
			ctx.fillText(text,14,14);
			ctx.restore();

			ctx.rotate(90*Math.PI/180.)
			ctx.save();
			ctx.translate(-width/2,-height/2);
			ctx.fillText(text,14,14);
			ctx.restore();

			ctx.rotate(90*Math.PI/180.)
			ctx.save();
			ctx.translate(-width/2,-height/2);
			ctx.fillText(text,14,14);
			ctx.restore();

			ctx.restore();
		}

	});
})