//
// Code for the Arachne Event Display
// Author: Nathaniel Tagg ntagg@otterbein.edu
// 
// Licence: this code is free for non-commertial use. Note other licences may apply to 3rd-party code.
// Any use of this code must include attribution to Nathaniel Tagg at Otterbein University, but otherwise 
// you're free to modify and use it as you like.
//

//calculate rgb component
function hToC(x, y, h) {
  var c;
  if(h < 0) {
    h += 1;
  }
  if(h > 1) {
    h -= 1;
  }
  if (h<1/6) {
    c=x +(y - x) * h * 6;
  } else {
    if(h < 1/2) {
      c=y;
    } else {
      if(h < 2/3) {
        c=x + (y - x) * (2 / 3 - h) * 6;
      } else {
        c=x;
      }
    }
  }
  return c;
}

function ColorScale( )
{
}

ColorScale.prototype.GetColor = function(i)
{
  return "0,0,0";
};

ColorScale.prototype.GetSelectedColor = function(x)
{
  return "255,0,0";
};

ColorScale.prototype.GetHoverColor = function(x)
{
  return "255,0,0";
};

ColorScale.prototype.GetCssColor = function(x) {
  var c = this.GetColor(x).split(',');
  var r = parseInt(c[0]).toString(16);
  var g = parseInt(c[1]).toString(16);
  var b = parseInt(c[2]).toString(16);
  if (r.length === 1) r = '0' + r;
  if (g.length === 1) g = '0' + g;
  if (b.length === 1) b = '0' + b;
  return('#' + r + g + b);
};

/////////////////////////////////////////////////////////////////////////////////
// ColorScaleRGB
// A simple color scale that returns the given rgb color.
/////////////////////////////////////////////////////////////////////////////////

ColorScaleRGB.prototype = new ColorScale(); 
ColorScaleRGB.prototype.constructor = ColorScaleRGB;
function ColorScaleRGB( r,g,b ) {
  ColorScale.call(this);
  this.color = String(parseInt(r)+","+parseInt(g)+","+parseInt(b));
}
ColorScaleRGB.prototype.GetColor = function(x)
{
    return this.color;
};

/////////////////////////////////////////////////////////////////////////////////
// ColorScaleIndexed
// A simple color scale that returns the given rgb color from an indexed list.
/////////////////////////////////////////////////////////////////////////////////
ColorScaleIndexed.prototype = new ColorScale();
ColorScaleIndexed.prototype.constructor = ColorScaleIndexed;

function ColorScaleIndexed( n ) 
{
  ColorScale.call(this);
  if(n===0) 
    this.color = "0,0,0";
  else if(n===1)
    this.color = "255,0,0";  
  else if(n===2)
     this.color = "0,255,0"; 
  else if(n===3)
    this.color = "0,0,255";  
  else {
      var s = new ColorScaleRedBlue();
      this.color = s.GetColor((n-3)/10);
  }
}
ColorScaleIndexed.prototype.GetColor = function(x)
{
    return this.color;
};

  


/////////////////////////////////////////////////////////////////////////////////
// ColorScaleRedBlue
// A simple color scale that returns the given rgb color from an indexed list.
/////////////////////////////////////////////////////////////////////////////////
ColorScaleRedBlue.prototype = new ColorScale(); 
ColorScaleRedBlue.prototype.constructor = ColorScaleRedBlue;

function ColorScaleRedBlue()
{
  ColorScale.call(this);  
}

ColorScaleRedBlue.prototype.GetColor = function(y) 
{
  var s,l,h,xx,yy,r,b,g;
  // saturation, lightness, hue:
  s = 0.8;
  l = 0.5;
  h = ((1-y)-0.0)*(0.6); //(1.0-y); //*0.778; // Out of 360
  
  yy = (l > 0.5)? l + s - l * s: l * (s + 1);
  xx = l * 2 - yy;
  r = 255*hToC(xx, yy, h + 1 / 3);
  g = 255*hToC(xx, yy, h);
  b = 255*hToC(xx, yy, h - 1 / 3);
  
  return String(parseInt(r)+","+parseInt(g)+","+parseInt(b));
};
ColorScaleRedBlue.prototype.GetHoverColor = function(x)
{
  return "50,50,50";
};
ColorScaleRedBlue.prototype.GetSelectedColor = function(x)
{
  return "50,50,50";
};


/////////////////////////////////////////////////////////////////////////////////
// ColorScaleBrownPurple
// A simple color scale that returns the given rgb color from an indexed list.
/////////////////////////////////////////////////////////////////////////////////
ColorScaleBrownPurple.prototype = new ColorScale();
ColorScaleBrownPurple.prototype.constructor = ColorScaleBrownPurple;

function ColorScaleBrownPurple()
{
  ColorScale.call(this);
  this.bp_stops = [ -0.03, 0.03, 0.12, 0.35, 0.70, 1.00 ];
  this.bp_r     = [ 0.95, 0.70, 0.87, 0.90, 1.00, 0.20 ];
  this.bp_g     = [ 0.95, 0.70, 0.80, 0.50, 0.00, 0.10 ];
  this.bp_b     = [ 0.95, 0.70, 0.12, 0.00, 0.00, 0.50 ]; 
  
}

ColorScaleBrownPurple.prototype.GetColor = function(y) 
{
  // function interp(inx,x,y) {
  //   for(var i=1;i<x.length;i++) {
  //     if(inx >= x[i-1]) {
  //       return (inx-x[i-1])/(x[i]-x[i-1])*(y[i]-y[i-1])+y[i-1];
  //     }
  //   }
  // }

  var d,r,g,b,i;

  for(i=1;i<this.bp_stops.length;i++) {
    if(y >= this.bp_stops[i-1]) {
      d = (y-this.bp_stops[i-1])/(this.bp_stops[i]-this.bp_stops[i-1]);
      r = this.bp_r[i-1] + d*(this.bp_r[i]-this.bp_r[i-1]);
      g = this.bp_g[i-1] + d*(this.bp_g[i]-this.bp_g[i-1]);
      b = this.bp_b[i-1] + d*(this.bp_b[i]-this.bp_b[i-1]);
    }
  }
   return String(parseInt(r*255)+","+parseInt(g*255)+","+parseInt(b*255)); 
   //my version return String(parseInt(b*200)+","+parseInt(r*200)+","+parseInt(g*200)); 
};
ColorScaleBrownPurple.prototype.GetHoverColor = function(x)
{
  return "0,0,255";
};
ColorScaleBrownPurple.prototype.GetSelectedColor = function(x)
{
  return "0,0,255";
};




function BrownPurplePalette(x)
{
}
/////////////////////////////////////////////////////////////////////////////////
// PhilipColorScale
// A simple color scale that returns the given rgb color from an indexed list.
// Made by Philip
/////////////////////////////////////////////////////////////////////////////////
PhilipColorScale.prototype = new ColorScale();
PhilipColorScale.prototype.constructor = PhilipColorScale;

function PhilipColorScale()
{
  ColorScale.call(this);
  this.bp_stops = [ -0.03, 0.03, 0.12, 0.35, 0.70, 1.00 ];
  this.bp_r     = [ 0.80, 0.50, 0.00, 0.40, 0.80, 0.90 ];
  this.bp_g     = [ 0.80, 0.50, 0.00, 0.00, 0.00, 0.00 ];
  this.bp_b     = [ 0.80, 0.50, 0.80, 0.80, 0.40, 0.00 ]; 
  // this should indicate low energy hits as grey going to blue and high energy hits as purple going to red
  
}

PhilipColorScale.prototype.GetColor = function(y) 
{
  function interp(inx,x,y) {
    for(var i=1;i<x.length;i++) {
      if(inx >= x[i-1]) {
        return (inx-x[i-1])/(x[i]-x[i-1])*(y[i]-y[i-1])+y[i-1];
      }
    }
  }

  var d,r,g,b,i;

  for(i=1;i<this.bp_stops.length;i++) {
    if(y >= this.bp_stops[i-1]) {
      d = (y-this.bp_stops[i-1])/(this.bp_stops[i]-this.bp_stops[i-1]);
      r = this.bp_r[i-1] + d*(this.bp_r[i]-this.bp_r[i-1]);
      g = this.bp_g[i-1] + d*(this.bp_g[i]-this.bp_g[i-1]);
      b = this.bp_b[i-1] + d*(this.bp_b[i]-this.bp_b[i-1]);
    }
  }
     return String(parseInt(r*250)+","+parseInt(g*250)+","+parseInt(b*250)); 
};
PhilipColorScale.prototype.GetHoverColor = function(x)
{
  return "0,0,255";
};
PhilipColorScale.prototype.GetSelectedColor = function(x)
{
  return "0,0,255";
};




function PhilipColorPalette(x)
{
}


/////////////////////////////////////////////////////////////////////////////////
// ColorScaleGray
// A simple color scale that returns the given rgb color on a black-to-white scale.
/////////////////////////////////////////////////////////////////////////////////
ColorScaleGray.prototype = new ColorScale();
ColorScaleGray.prototype.constructor = ColorScaleGray;

function ColorScaleGray()
{
  ColorScale.call(this);
}

ColorScaleGray.prototype.GetColor = function(y) 
{
  var v = (1-y)*0.9;
  return String(parseInt(v*255)+","+parseInt(v*255)+","+parseInt(v*255)); 
};
ColorScaleGray.prototype.GetHoverColor = function(x)
{
  return "0,0,255";
};
ColorScaleGray.prototype.GetSelectedColor = function(x)
{
  return "0,0,255";
};

/////////////////////////////////////////////////////////////////////////////////
// CurtPalette
// A simple color scale that returns the given rgb color from an indexed list.
/////////////////////////////////////////////////////////////////////////////////
CurtColorScale.prototype = new ColorScale();
CurtColorScale.prototype.constructor = CurtColorScale;

function CurtColorScale()
{
  ColorScale.call(this);
  this.bp_stops = [ -0.05, 0.18, 0.35, 0.60, 1.00];
  this.bp_r     = [ 0.95, 0.31, 0.93, 1.00, 1.00];
  this.bp_g     = [ 0.95, 0.78, 0.93, 0.50, 0.25];
  this.bp_b     = [ 0.95, 0.31, 0.25, 0.00, 0.25]; 
  
}

CurtColorScale.prototype.GetColor = function(y) 
{
  function interp(inx,x,y) {
    for(var i=1;i<x.length;i++) {
      if(inx >= x[i-1]) {
        return (inx-x[i-1])/(x[i]-x[i-1])*(y[i]-y[i-1])+y[i-1];
      }
    }
  }

  var d,r,g,b,i;

  for(i=1;i<this.bp_stops.length;i++) {
    if(y >= this.bp_stops[i-1]) {
      d = (y-this.bp_stops[i-1])/(this.bp_stops[i]-this.bp_stops[i-1]);
      r = this.bp_r[i-1] + d*(this.bp_r[i]-this.bp_r[i-1]);
      g = this.bp_g[i-1] + d*(this.bp_g[i]-this.bp_g[i-1]);
      b = this.bp_b[i-1] + d*(this.bp_b[i]-this.bp_b[i-1]);
    }
  }
   return String(parseInt(r*255)+","+parseInt(g*255)+","+parseInt(b*255)); 
   //my version return String(parseInt(b*200)+","+parseInt(r*200)+","+parseInt(g*200)); 
};
CurtColorScale.prototype.GetHoverColor = function(x)
{
  return "0,0,255";
};
CurtColorScale.prototype.GetSelectedColor = function(x)
{
  return "0,0,255";
};



/////////////////////////////////////////////////////////////////////////////////
// HueColorScale
// Just use hsv
/////////////////////////////////////////////////////////////////////////////////
HueColorScale.prototype = new ColorScale();
function HueColorScale(brightness,phase)
{
  this.brightness = (brightness===null)?0.95:brightness;
  this.phase =      (phase===null)?0.15:phase;
}

HueColorScale.prototype.GetColor = function(y) 
{
  var h = (y+this.phase)%1.0;
  var s = 0.9;
  var v = this.brightness;
  
  var rgb = hsvToRgb(h,s,v);
  var st= Math.round(rgb[0])+","+Math.round(rgb[1])+","+Math.round(rgb[2]);
  return st;
};

/////////////////////////////////////////////////////////////////////////////////
// BetterHueColorScale
// from http://www.tinaja.com/glib/falseclr.pdf
/////////////////////////////////////////////////////////////////////////////////
BetterHueColorScale.prototype = new ColorScale();           

  
function BetterHueColorScale(brightness)
{
  this.brightness = brightness;
  ColorScale.call(this);
  this.hsv_stops = [
   [0.000,0.710], [0.002,0.712], [0.006,0.715], [0.012,0.721], [0.015,0.725], [0.018,0.727], [0.024,0.733], [0.027,0.737], [0.030,0.739], [0.036,0.745], [0.039,0.749], [0.042,0.751], [0.048,0.757], [0.050,0.760], [0.054,0.763], [0.060,0.769], [0.062,0.772], [0.066,0.775], [0.072,0.781], [0.074,0.784], [0.078,0.787], [0.084,0.793], [0.086,0.796], [0.090,0.799], [0.096,0.805], [0.099,0.808], [0.102,0.811], [0.107,0.816], [0.110,0.820], [0.112,0.821], [0.116,0.825], [0.119,0.828], [0.119,0.828], [0.122,0.831], [0.125,0.834], [0.124,0.833], [0.125,0.834], [0.128,0.836], [0.124,0.836], [0.128,0.837], [0.131,0.840], [0.129,0.838], [0.131,0.840], [0.134,0.843], [0.133,0.842], [0.135,0.845], [0.139,0.844], [0.138,0.847], [0.141,0.851], [0.145,0.854], [0.145,0.854], [0.149,0.858], [0.152,0.861], [0.154,0.862], [0.157,0.866], [0.160,0.869], [0.161,0.870], [0.165,0.874], [0.168,0.877], [0.169,0.878], [0.173,0.882], [0.176,0.885], [0.177,0.886], [0.181,0.890], [0.184,0.894], [0.185,0.894], [0.189,0.898], [0.192,0.901], [0.193,0.902], [0.197,0.906], [0.200,0.909], [0.201,0.910], [0.206,0.915], [0.209,0.918], [0.214,0.923], [0.225,0.995], [0.228,0.991], [0.238,0.983], [0.254,0.965], [0.257,1.000], [0.271,1.000], [0.289,0.928], [0.292,0.925], [0.307,0.909], [0.324,0.891], [0.328,0.888], [0.340,0.875], [0.353,0.860], [0.357,0.857], [0.366,0.846], [0.378,0.836], [0.381,0.835], [0.389,0.824], [0.398,0.814], [0.402,0.811], [0.402,0.805], [0.416,0.796], [0.419,0.792], [0.424,0.787], [0.433,0.778], [0.436,0.775], [0.441,0.770], [0.450,0.761], [0.453,0.757], [0.458,0.757], [0.466,0.743], [0.470,0.740], [0.475,0.734], [0.484,0.725], [0.487,0.722], [0.492,0.717], [0.501,0.708], [0.504,0.704], [0.509,0.699], [0.518,0.693], [0.521,0.687], [0.526,0.681], [0.534,0.673], [0.537,0.669], [0.542,0.665], [0.549,0.657], [0.552,0.654], [0.556,0.650], [0.562,0.643], [0.566,0.640], [0.569,0.637], [0.574,0.631], [0.578,0.627], [0.580,0.625], [0.586,0.619], [0.589,0.615], [0.592,0.612], [0.597,0.607], [0.601,0.603], [0.603,0.601], [0.609,0.595], [0.614,0.591], [0.615,0.589], [0.621,0.583], [0.624,0.579], [0.626,0.577], [0.632,0.575], [0.635,0.567], [0.638,0.565], [0.644,0.559], [0.643,0.553], [0.649,0.553], [0.655,0.547], [0.658,0.543], [0.661,0.541], [0.667,0.535]
  ];
}

BetterHueColorScale.prototype.GetColor = function(y) 
{
  y+=0.5;
  var row = y*(this.hsv_stops.length);
  var irow = Math.floor(row);
  var drow = row-irow;
  
  var c1 = this.hsv_stops[irow%this.hsv_stops.length];
  var c2 = this.hsv_stops[(irow+1)%this.hsv_stops.length];
  var h = c1[0] + (c2[0]-c1[0])*drow;
  var s = c1[1] + (c2[1]-c1[1])*drow;
  var l = this.brightness; //c1[2] + (c2[2]-c1[2])*drow;
  var rgb = hsvToRgb(h,s,l);
  var st= Math.round(rgb[0])+","+Math.round(rgb[1])+","+Math.round(rgb[2]);
  // console.log('betterhue',y,row,h,s,l,st);
  return st;
};




/////////////////////////////////////////////////////////////////////////////////
// ColorScaler
// A wrapper for ColorScales.
/////////////////////////////////////////////////////////////////////////////////
function ColorScaler(scalename)
{
  this.min = 0;
  this.max = 35;
  this.SetScale(scalename);
}


ColorScaler.prototype.SetScale = function(sel)
{
  switch(sel){
  // PhilipColorPalette not part of original
    case "PhilipColorPalette": this.colorScale = new PhilipColorScale(); break;
    case "BrownPurplePalette": this.colorScale = new ColorScaleBrownPurple(); break;
    case "GrayscalePalette":   this.colorScale = new ColorScaleGray(); break;
    case "RedBluePalette":     this.colorScale = new ColorScaleRedBlue(); break;
    case "CurtPalette": this.colorScale = new CurtColorScale(); break;
    default:
      this.colorScale = new ColorScaleRedBlue();
  }
};

ColorScaler.prototype.GetColor = function(x) { 
  var y;
  if(x < this.min) y=0;
  else if(x >= this.max) y = 1;
  else y = (x-this.min)/(this.max-this.min);
  return this.colorScale.GetColor(y); 
};

ColorScaler.prototype.GetSelectedColor = function(x) { 
  return this.colorScale.GetSelectedColor(x); 
};

ColorScaler.prototype.GetHoverColor = function(x) { 
  return this.colorScale.GetHoverColor(x); 
};


////////////////////////
// Utility functions
// Thanks to: http://mjijackson.com/2008/02/rgb-to-hsl-and-rgb-to-hsv-color-model-conversion-algorithms-in-javascript
//

 // * Converts an RGB color value to HSL. Conversion formula
 // * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 // * Assumes r, g, and b are contained in the set [0, 255] and
 // * returns h, s, and l in the set [0, 1].
 // *
 // * @param   Number  r       The red color value
 // * @param   Number  g       The green color value
 // * @param   Number  b       The blue color value
 // * @return  Array           The HSL representation
 
function rgbToHsl(r, g, b){
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;

    if(max == min){
        h = s = 0; // achromatic
    }else{
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch(max){
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return [h, s, l];
}

 // * Converts an HSL color value to RGB. Conversion formula
 // * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 // * Assumes h, s, and l are contained in the set [0, 1] and
 // * returns r, g, and b in the set [0, 255].
 // *
 // * @param   Number  h       The hue
 // * @param   Number  s       The saturation
 // * @param   Number  l       The lightness
 // * @return  Array           The RGB representation



function hslToRgb(h, s, l){
  function hue2rgb(p, q, t){
      if(t < 0) t += 1;
      if(t > 1) t -= 1;
      if(t < 1/6) return p + (q - p) * 6 * t;
      if(t < 1/2) return q;
      if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    }
 
    var r, g, b;

    if(s === 0){
        r = g = b = l; // achromatic
    }else{
        

        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return [r * 255, g * 255, b * 255];
}

 // * Converts an RGB color value to HSV. Conversion formula
 // * adapted from http://en.wikipedia.org/wiki/HSV_color_space.
 // * Assumes r, g, and b are contained in the set [0, 255] and
 // * returns h, s, and v in the set [0, 1].
 // *
 // * @param   Number  r       The red color value
 // * @param   Number  g       The green color value
 // * @param   Number  b       The blue color value
 // * @return  Array           The HSV representation

function rgbToHsv(r, g, b){
    r = r/255; g = g/255; b = b/255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, v = max;

    var d = max - min;
    s = max === 0 ? 0 : d / max;

    if(max == min){
        h = 0; // achromatic
    }else{
        switch(max){
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return [h, s, v];
}

 // * Converts an HSV color value to RGB. Conversion formula
 // * adapted from http://en.wikipedia.org/wiki/HSV_color_space.
 // * Assumes h, s, and v are contained in the set [0, 1] and
 // * returns r, g, and b in the set [0, 255].
 // *
 // * @param   Number  h       The hue
 // * @param   Number  s       The saturation
 // * @param   Number  v       The value
 // * @return  Array           The RGB representation
 
function hsvToRgb(h, s, v){
    var r, g, b;

    var i = Math.floor(h * 6);
    var f = h * 6 - i;
    var p = v * (1 - s);
    var q = v * (1 - f * s);
    var t = v * (1 - (1 - f) * s);

    switch(i % 6){
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        case 5: r = v; g = p; b = q; break;
    }

    return [r * 255, g * 255, b * 255];
}


