var colors = [
[0, 0, 0],
[87, 87, 87],
[173, 35, 35],
[42, 75, 215],
[29, 105, 20],
[129, 74, 25],
[129, 38, 192],
[160, 160, 160],
[129, 197, 122],
[157, 175, 255],
[41, 208, 208],
[255, 146, 51],
[255, 238, 51],
[233, 222, 187],
[255, 205, 243],
[255, 255, 255] ];


function toHex(i) { 
  var hex = Number(rgb).toString(16);
  if (hex.length < 2) {
       hex = "0" + hex;
  }
  return hex;
};

for(var c of colors)
{
	var r = Number(c[0]).toString(16).padStart(2,0);
	var g = Number(c[1]).toString(16).padStart(2,0);
	var b = Number(c[2]).toString(16).padStart(2,0);
	console.log('#'+r+g+b);
}