#!/env/node

var data='902.25049,222.98633 233.17773,222.98633 233.17773,364.71875 0,182.35938 233.17773,0 233.17773,141.73242 902.25049,141.73242 902.25049,222.98633';
var pairs=data.split(' ');
for(var i=0;i<pairs.length;i++){
	var p = pairs[i].split(',');
	console.log(p);
	p[0] = parseFloat(p[0]);
	p[1] = parseFloat(p[1]);
	pairs[i] =p;
}
console.log('---')
console.log(pairs);

// rotate 90
var angle = 90;

var theta = angle*Math.PI/180.;
for(var i=0;i<pairs.length;i++){
	var p = pairs[i];
	var x = p[0]*Math.cos(theta) + p[1]*Math.sin(theta);
	var y = p[0]*Math.sin(theta) - p[1]*Math.cos(theta);
	pairs[i] = [x,y];
}

// normalize coords to 0-max size.
var max_size = 50;

var min_x = 1e99;
var min_y = 1e99;
var max_x = -1e99;
var max_y = -1e99;
for(var i=0;i<pairs.length;i++){
	var p = pairs[i];
	var min_x = Math.min(min_x,p[0]);
	var max_x = Math.max(max_x,p[0]);
	var min_y = Math.min(min_y,p[1]);
	var max_y = Math.max(max_y,p[1]);
}

var w = max_x-min_x;
var h = max_y-min_y;
var max=Math.max(w,h);
var scale = max_size/max;

for(var i=0;i<pairs.length;i++){
	var p = pairs[i];
	var x = (p[0]-min_x)*scale;
	var y = (p[1]-min_y)*scale;
	pairs[i] = [x,y];
}

// output
var outarr = [];
for(var i=0;i<pairs.length;i++){
	var p = pairs[i];
	outarr.push(p.join(','));
}
var str = outarr.join(' ');

var width = w*scale;
var height = h*scale;

var nl = "\n";
var svg = '';
svg+= '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n';
svg+= `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox='0 0 ${width} ${height}' xml:space="preserve">\n`;
svg+= `<polygon points="${str}" />\n`;
svg+= `</svg>\n`;
console.log(svg);

