
var gqr = null;

// lowres = false means lots of error correction, 
// lowres = true means low-res, easier to see
function DrawQRCode(canvases,text,desc,lowres){
  console.log("DrawQRCode",...arguments);
	$(canvases).each(function(){
			var canvas = this;
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
      var scale = 12;//Math.Round(w/12*8);
      var border = 8; //w/12*4;

  	// 	var scale = 8; // pixels per module
			// var border = 8;//4; // modules
			// var svg = document.getElementById("qrcode-svg");
			// canvas.style.display = "none";
			// svg.style.display = "none";

			var ctx = canvas.getContext("2d");
			qr.drawCanvas(scale, border, canvas);
			ctx.font = "16px Inconsolata";
			ctx.fillStyle = "black";
			var width = canvas.width;
			var height = canvas.height;
			ctx.save();
			ctx.translate(width/2,height/2);

			ctx.save();
			ctx.translate(-width/2,-height/2);

        ctx.scale(width/520,width/520);
  			ctx.fillText(text,14,14);
  			if(desc) ctx.fillText(desc,14,31);

			ctx.restore();

			ctx.rotate(90*Math.PI/180.)
			ctx.save();
			ctx.translate(-width/2,-height/2);
        ctx.scale(width/520,width/520);
        ctx.fillText(text,14,14);
        if(desc) ctx.fillText(desc,14,31);
			ctx.restore();

			ctx.rotate(90*Math.PI/180.)
			ctx.save();
			ctx.translate(-width/2,-height/2);
        ctx.scale(width/520,width/520);
        ctx.fillText(text,14,14);
        if(desc) ctx.fillText(desc,14,31);
			ctx.restore();

			ctx.rotate(90*Math.PI/180.)
			ctx.save();
			ctx.translate(-width/2,-height/2);
        ctx.scale(width/520,width/520);
        ctx.fillText(text,14,14);
        if(desc) ctx.fillText(desc,14,31);
			ctx.restore();

			ctx.restore();
	})

};