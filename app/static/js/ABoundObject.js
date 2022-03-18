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

// Some utility functions.

function getAbsolutePosition(element) {
   var r = { x: element.offsetLeft, y: element.offsetTop };
   if (element.offsetParent) {
     var tmp = getAbsolutePosition(element.offsetParent);
     r.x += tmp.x;
     r.y += tmp.y;
   }
   return r;
};


function ClosestMatch( element, selector )
{
  var parents = $(element).parents();
  for(var i = 0; i<parents.length; i++) {
    var got = $(selector,parents[i]);
    if(got.length>0) return got.first();
  }
  // no match.
  return null;
};

function GetLocalControl( element, selector )
{
  // Is there one in our portlet?
  var p = $(element).closest('.portlet');
  if(p.length>0) {
    var c = $(selector,p.first());
    return c;
  }
  return $();
};

function GetBestControl( element, selector )
{
  var c = GetLocalControl(element,selector);
  if(c.length>0) return c;
  c = $(selector,$('#config-port'));
  if(c.length>0) return c;
  return ClosestMatch(element,selector);
};


var gUniqueIdCounter=100;

// This class is a core base class for
// models that bind to views.
// The default arguments are the element it's attaching to,
// and any configurable options you want to add to the class.
// The object pulls data from the data-options field of the object.

function ABoundObject(element, options)
{
  ///
  /// Constructor.
  ///
  if(!element) return; 
  if($(element).length<1) {return;} // Jquery object with zero length used.
  this.element = $(element).get(0); // Get first bound object;
  this.UniqueId = gUniqueIdCounter++;
  this.NameSpace = "ns" + this.UniqueId;

  // Merge in the options.
  $.extend(true,this,options);

  // Merge in options from element
  var element_settings = $(element).data('options');
  // console.log("ABoundObject::Constructor element options:",element_settings);
  if(element_settings) {
    // console.log(element_settings, element_settings_obj);
    $.extend(true,this,element_settings); // Change default settings by provided overrides.  
  }
  $(this.element).on("remove."+this.mynamespace, this.Remove.bind(this) ); 
  
}

ABoundObject.prototype.Remove = function(ev)
{
  // Remove all event handlers from this object, the document, and the window.
  $(this.element) .off("."+this.NameSpace);
  $(this.window)  .off("."+this.NameSpace);
  $(this.document).off("."+this.NameSpace);
};

//
// Utility.
// See : https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/bind
if (!Function.prototype.bind) {
  Function.prototype.bind = function (oThis) {
    if (typeof this !== "function") {
      // closest thing possible to the ECMAScript 5 internal IsCallable function
      throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
    }
 
    var aArgs = Array.prototype.slice.call(arguments, 1), 
        fToBind = this, 
        fNOP = function () {},
        fBound = function () {
          return fToBind.apply(this instanceof fNOP && oThis ? this : oThis,
                               aArgs.concat(Array.prototype.slice.call(arguments)));
        };
 
    fNOP.prototype = this.prototype;
    fBound.prototype = new fNOP();
 
    return fBound;
  };
}


