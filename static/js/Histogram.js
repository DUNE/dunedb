//
// Code for the Arachne Event Display
// Author: Nathaniel Tagg ntagg@otterbein.edu
// 
// Licence: this code is free for non-commertial use. Note other licences may apply to 3rd-party code.
// Any use of this code must include attribution to Nathaniel Tagg at Otterbein University, but otherwise 
// you're free to modify and use it as you like.
//

///
/// Boilerplate:  Javascript utilities for MINERvA event display, codenamed "Arachne"
/// Nathaniel Tagg  - NTagg@otterbein.edu - June 2009
///

// Utility functions:

// Build histogram out of JSON data
function HistogramFrom(o)
{
  delete o._owner; // if it exists.
  for(var j in o) { if(o[j]) delete o[j]._owner; }
  return $.extend(true,new Histogram(1,0,1), o);  
};

// Create a histogram with good boundaries that will incorporate bins 'min' and 'max' into the view.

function CreateGoodHistogram(nbins, min, max)
{  
  // Primative version does something reasonable, if not perfect:
  var newmax = max;
  if(max<=min) newmax = min+1;// Add 1 if we're in trouble
  var h= new Histogram(nbins,min, newmax + (newmax-min)/nbins);

  // console.log("CreateGoodHistogram",nbins,min,max,h);
  return h;  
};

function Histogram(n, min, max)
{
    this.n = n;
    this.data = new Array(n);
    this.min = min;
    this.max = max;
    this.max_x = min;
    this.min_x = max;
    this.Clear();
}

Histogram.prototype.Clear = function()
{
  for (var i = 0; i < this.n+1; i++) {
      this.data[i] = 0;
  }
  this.underflow = 0;
  this.overflow = 0;
  this.max_content = 0;
  this.min_content = 0;
  this.total = 0;
  this.sum_x = 0;
  this.sum_x2 = 0;
};

Histogram.prototype.RebinBy = function(by) 
{
  // Decreases number of bins by a factor.
  var newdata = [];
  var newn = Math.floor(this.n/by);
  var i;
  for(i=0;i<newn; i++) newdata[i]=0;
  for(i=0;i<this.n+1; i++){
    newdata[Math.floor(i/by)]+=this.data[i];
  }
  this.data = newdata;
  this.n = newn;
}

Histogram.prototype.TwoSideExpandFill = function(x,val) 
{
  // Fill a histogram, but always expand limits to grow, instead of overflowing.
  // Expand both the upper and lower limits when you grow.
  if(!val) val = 1;
  var bin = this.GetBin(x);
  var nadd = 0;
  var newdata, i, binwidth;
  if (bin<0) {
    // console.log("expandlow");
    // Instead of underflowing, figure out how many bins we need at the beginning to accomodate this.
    nadd = -bin;
  } else if (bin >= this.n) {
    // Instead of overflowing, expand the histogram.    
    // console.log("expandhigh");
    nadd = bin + 1 - this.n;
  }
  
  if(nadd>0) {
    newdata = [];
    for (i = 0; i < nadd; i++) newdata[i] = 0;
    this.data = newdata.concat(this.data);
    this.data = this.data.concat(newdata);    
    binwidth = (this.max - this.min)/this.n;
    this.min = this.min - binwidth*nadd;
    this.max = this.max + binwidth*nadd;
    console.warn("TwoSideExpand: x="+x+" min:"+this.min+" max:"+this.max);
    this.n += nadd*2;
    bin = this.GetBin(x); // should be 0 or n-1 now.
  }
    
  this.total+=val;
  this.sum_x += val*x;
  this.sum_x2 += val*x*x;
  if(x > this.max_x) this.max_x = x;
  if(x < this.min_x) this.min_x = x;

  this.data[bin]+=val;
  if(this.data[bin] > this.max_content) this.max_content = this.data[bin];
  if(this.data[bin] < this.min_content) this.min_content = this.data[bin];      
  
};


Histogram.prototype.ExpandFill = function(x,val) 
{
  // Fill a histogram, but always expand limits to grow, instead of overflowing.
  if(!val) val = 1;
  var bin = this.GetBin(x);
  var nadd, newdata, i, binwidth;
  if (bin<0) {
    console.log("expandlow");
    // Instead of underflowing, figure out how many bins we need at the beginning to accomodate this.
    nadd = -bin;
    if(this.n+nadd > 10000) { console.error("Increasing bounds on histogram",this,"to",this.n+nadd,". This might be bad!"); }
    newdata = new Array(nadd);
    for (i = 0; i < nadd; i++) newdata[i] = 0;
    this.data = newdata.concat(this.data);
    binwidth = (this.max - this.min)/this.n;
    this.min = this.min - binwidth*nadd;
    this.n += nadd;
    bin = this.GetBin(x); // should be 0 now.
  }

  if (bin >= this.n) {
    // Instead of overflowing, expand the histogram.    
    console.log("expandhigh");
    nadd = bin + 1 - this.n;
    if(this.n+nadd > 10000) { 
      console.error("Increasing bounds on histogram",this,"to",this.n+nadd,". This might be bad!"); 
    }
    newdata = new Array(nadd);
    for (i = 0; i < nadd; i++) newdata[i] = 0;
    this.data = this.data.concat(newdata);
    binwidth = (this.max - this.min)/this.n;
    this.max = this.max + binwidth*nadd;
    this.n += nadd;
    bin = this.GetBin(x); // should be n now.
  }
  
  this.total+=val;
  this.sum_x += val*x;
  this.sum_x2 += val*x*x;
  if(x > this.max_x) this.max_x = x;
  if(x < this.min_x) this.min_x = x;

  this.data[bin]+=val;
  if(this.data[bin] > this.max_content) this.max_content = this.data[bin];
  if(this.data[bin] < this.min_content) this.min_content = this.data[bin];      
  
};

Histogram.prototype.Fill = function(x,val) 
{
  if(!val) val = 1;
  if (x < this.min) {
      this.underflow+=val;
      return;
  }
  if ( !(x < this.max) )  { // Cleverness: catches NaNs into overflow.
      this.overflow+=val;
      return;
  }
  this.total+=val;
  this.sum_x += val*x;
  this.sum_x2 += val*x*x;
  if(x > this.max_x) this.max_x = x;
  if(x < this.min_x) this.min_x = x;
  var bin = this.GetBin(x);

  this.data[bin]+=val;
  if(this.data[bin] > this.max_content) this.max_content = this.data[bin];
  if(this.data[bin] < this.min_content) this.min_content = this.data[bin];      
};

Histogram.prototype.GetBin = function(x) 
{
   if(this.x) {
    // binary search
  	var j = 0, length = this.x.length;
    var i = 0;
    while (j < length) {
    	i = Math.floor((length + j - 1) / 2);       
    	// If the value we're searching for is greater than the median, move our lower-bound past the median
      if (x > this.x[i]) 
        j = i + 1;
      // Otherwise, if the value we're searching for is less than the median, move our upper-bound to the median value
      else if (x < this.x[i]) 
        length = i;
      // If neither of the above conditions have been met, we have found our value. Congratulations! Return it!
      else
        return i;
    }
    // If we've somehow exited the loop, our value was not present and we should return "Not Found".
    return i-1;
  }
  return  Math.floor((x - this.min) * this.n / (this.max - this.min));
};

Histogram.prototype.SetBinContent = function(bin,val) 
{
    var x = this.GetX(bin);
    this.total -=this.data[bin];
    this.sum_x -=this.data[bin]*x;
    this.sum_x2-=this.data[bin]*x*x;
    this.total+=val;
    this.sum_x += val*x;
    this.sum_x2 += val*x*x;
    if(x > this.max_x) this.max_x = x;
    if(x < this.min_x) this.min_x = x;
  
    this.data[bin]=val;
    if(this.data[bin] > this.max_content) this.max_content = this.data[bin];
    if(this.data[bin] < this.min_content) this.min_content = this.data[bin];      
};


    
Histogram.prototype.GetX = function(bin) 
{
  if(this.x) return this.x[bin];
  return (bin/this.n)*(this.max-this.min) + this.min;
};

Histogram.prototype.GetMean = function()
{
  return this.sum_x/this.total;
};

Histogram.prototype.GetRMS = function()
{
  var x = this.sum_x/this.total;
  var rms2 = Math.abs(this.sum_x2/this.total -x*x); // As root TH1 does.
  return Math.sqrt(rms2);
};


Histogram.prototype.Dump = function()
{
  var r = "";
  for(var i=0;i<this.n;i++) {
    r += i + " \t " << this.data[i] << "\n";
  }
  r += "Overflow:  " + this.overflow + "\n";
  r += "Underflow: " + this.underflow + "\n";
  return r;
};

Histogram.prototype.GetMeanY = function()
{
  var mean = 0;
  var n = 0;
  for(var i=0; i<this.n; i++) {
    if(this.errs && this.data[i]==0 && this.errs[i] == 0) continue;
    mean += this.data[i];
    n+=1;
  }
  return mean/n;       
}

    
Histogram.prototype.GetROI = function(frac)
{
  // Find the start and endpoints that throw away frac of the total charge
  var bin_low = 0;
  // bring bin_low up until we've got (1-frac)/2 
  var tot_low = 0;
  while(bin_low<this.n && tot_low<(frac*this.total/2) ) {
    tot_low += this.data[bin_low];
    bin_low++;
  }

  var bin_high = this.n-1;
  // bring bin_low up until we've got (1-frac)/2 
  var tot_high = 0;
  while(bin_high>0 && tot_high<(frac*this.total/2) ) {
    tot_high += this.data[bin_high];
    bin_high--;
  }

  return [this.GetX(bin_low),this.GetX(bin_high)];
};

Histogram.prototype.RecomputeMinMaxContent = function()
{
  // Find the start and endpoints that throw away frac of the total charge
  if(this.n<1) return;
  this.min_content = Number.MAX_VALUE;
  this.max_content = -Number.MAX_VALUE;
  for(var i=0;i<this.n;i++) {
    if(!isNaN(this.data[i])) {
      this.min_content = Math.min(this.min_content, this.data[i]);
      this.max_content = Math.max(this.max_content, this.data[i]);
    }
  }
  if(this.errs) {
    this.min_content_with_err = this.min_content;
    this.max_content_with_err = this.max_content;
    for(var i=0;i<this.n;i++) {
      if(!isNaN(this.data[i])) {
        this.min_content_with_err = Math.min(this.min_content_with_err, this.data[i]-this.errs[i]);
        this.max_content_with_err = Math.max(this.max_content_with_err, this.data[i]+this.errs[i]);
      }
    }
  }
};
