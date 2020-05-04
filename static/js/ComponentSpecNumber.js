

///
/// Custom component for lists of numbers.
///
/// Basically sets some good defaults for what a UUID should look like
///
/// To do: add default validation technique.
///


// Formio.Components.components.file.builderInfo.schema=Formio.Components.components.file.schema();
var NumberComponent = Formio.Components.components.number;

function SpecNumberComponent(component, options, data) {
  // This is a normal text field...
  acuuid = this;
  NumberComponent.prototype.constructor.call(this, component, options, data);
}

// Perform typical ES5 inheritance
SpecNumberComponent.prototype = Object.create(NumberComponent.prototype);
SpecNumberComponent.prototype.constructor = SpecNumberComponent;

SpecNumberComponent.schema = function() {
  var s= NumberComponent.schema({
      // "specification_nominal":0,
      // "specification_tolerance":1e99,
      // "specification_minimum": -1e99,
      // "specification_maximum": 1e99,
      "label": "SpecNumberComponent",
      "key": "specvalue",
      "type": "SpecNumberComponent",
      "input": true  
    });
  console.log('schema',s);
  return s;
};
SpecNumberComponent.builderInfo = {
  title: 'Number with tolerance',
  group: 'custom',
  icon: '&plusmn;',
  weight: 72,
  documentation: '#', 
  schema: SpecNumberComponent.schema()
};

SpecNumberComponent.prototype.showNominal = function()
{
  var nominal = "";
  if('specification_nominal' in this.component)  
    nominal = "Nominal "+ this.component.specification_nominal;
  if(('specification_nominal' in this.component) && ('specification_tolerance' in this.component)) {
    nominal += "&plusmn;"+this.component.specification_tolerance;
  }
  if('specification_minimum' in this.component) nominal += " min "+this.component.specification_minimum;
  if('specification_maximum' in this.component) nominal += " max "+this.component.specification_maximum;
  if(this.component.units) nominal += " " + this.component.units;
  this.specification_label.html(nominal).removeClass('warning');
}

SpecNumberComponent.prototype.checkValue = function(val)
{
  this.showNominal();

  var warning = null;
  if(('specification_nominal' in this.component) && ('specification_tolerance' in this.component)) {
    if((val - this.component.specification_nominal) > this.component.specification_tolerance) 
      warning = "Above tolerance." ;

    if((val - this.component.specification_nominal) < -this.component.specification_tolerance) 
      warning = "Below tolerance.";
  }

  if('specification_minimum' in this.component) {
    if(val < this.component.specification_minimum)
      warning = "Below minimum specification. ";
  }

  if('specification_maximum' in this.component) {
    if (val > this.component.specification_maximum)
      warning = "Above maximum specification. ";
  }
  if(warning) this.specification_label.prepend("<span class='specification-warning'>"+warning+"</span>");
}

SpecNumberComponent.prototype.renderElement = function(value,index) 
{
  var tpl = '';
  tpl += NumberComponent.prototype.renderElement.call(this,value,index);
  tpl += "<div class='specification-label'></div>";

  return tpl;

}

SpecNumberComponent.prototype.attach = function(element) 
{
  /// Called after rendering, just as the component is being inserted into the DOM.
  /// .. just like a text area...
  NumberComponent.prototype.attach.call(this,element);
  this.specification_label = $(".specification-label",this.element);
  this.showNominal();
}


SpecNumberComponent.prototype.setValue = function(value,flags)
{
  this.checkValue(value);
  return NumberComponent.prototype.setValue.call(this,value,flags);
}

SpecNumberComponent.prototype.getValue = function()
{
  var value = NumberComponent.prototype.getValue.call(this);
  this.checkValue(value);
  return value;
}


SpecNumberComponent.editForm = NumberComponent.editForm;

SpecNumberComponent.editForm = function(a,b,c)
{
    var form = NumberComponent.editForm(a,b,c);
    var tabs = form.components.find(obj => { return obj.type === "tabs" });
    var datatab = tabs.components.find(obj => {return obj.key=='data'});

    // Remove 'multiple components'. I could probably make it work.. but nah
    datatab.components.splice(datatab.components.findIndex(obj=>{return obj.key = "multiple"}),1);
    var displaytab = tabs.components.find(obj => {return obj.key=='display'});


    datatab.components.splice(1,0,
      {
        "input": true,
        "key": "specification_nominal",
        "label": "Nominal Value",
        "placeholder": "Nominal value ",
        "tooltip": "This is the nominal value this element should hold",
        "type": "number",
      },
      {
        "input": true,
        "key": "specification_tolerance",
        "label": "Tolerance",
        "tooltip": "This is the tolerance, plus or minus, around the main value. If outside this range, a warning will show.",
        "type": "number",
      },
      {
        "input": true,
        "key": "specification_minimum",
        "label": "Minimum Specification",
        "tooltip": "If less than this value, a warning will show.",
        "type": "number",
      },      
      {
        "input": true,
        "key": "specification_maximum",
        "label": "Maximum Specification",
        "tooltip": "If greater than than this value, a warning will show.",
        "type": "number",
      },
      {
        "input": true,
        "key": "units",
        "label": "Units",
        "tooltip": "Optional units to show",
        "type": "textfield",
      }
  );


    return form;
}


Formio.Components.addComponent('SpecNumberComponent', SpecNumberComponent);


