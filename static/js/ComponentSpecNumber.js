

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
      "label": "NumberPlusOrMinus",
      "key": "specvalue",
      "type": "SpecNumberComponent",
      "input": true  
    });
  console.log('schema',s);
  return s;
};
SpecNumberComponent.builderInfo = {
  title: 'SpecNumberComponent',
  group: 'custom',
  icon: 'chart-bar',
  weight: 72,
  documentation: '#', 
  schema: SpecNumberComponent.schema()
};



SpecNumberComponent.prototype.checkValue = function(val)
{
  var warning = "";
  if(('specification_nominal' in this.component) && ('specification_tolerance' in this.component)) {
    if((val - this.component.specification_nominal) > this.component.specification_tolerance) 
      warning = "Above tolerance  ("+this.component.specification_nominal+"&plusmn;"+this.component.specification_tolerance+")";

    if((val - this.component.specification_nominal) < -this.component.specification_tolerance) 
      warning = "Below tolerance  ("+this.component.specification_nominal+"&plusmn;"+this.component.specification_tolerance+")";
  }

  if(('specification_minimum' in this.component) && (val < this.component.specification_minimum))
    warning = "Below minimum specification ("+this.component.specification_minimum+")";

  if(('specification_maximum' in this.component) && (val > this.component.specification_maximum))
    warning = "Above maximum specification ("+this.component.specification_maximum+")";

  this.specification_warning.html(warning);
}

SpecNumberComponent.prototype.renderElement = function(value,index) 
{
  var tpl = '';
  tpl += NumberComponent.prototype.renderElement.call(this,value,index);
  tpl += "<div><em class='specification-warning'></em></div>";

  return tpl;

}

SpecNumberComponent.prototype.attach = function(element) 
{
  /// Called after rendering, just as the component is being inserted into the DOM.
  /// .. just like a text area...
  NumberComponent.prototype.attach.call(this,element);
  this.specification_warning = $(".specification-warning",this.element);
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
    datatab.components.splice(datatab.components.findIndex(obj=>{return obj.key = "multiple"}),1,[]);
    var displaytab = tabs.components.find(obj => {return obj.key=='display'});


    datatab.components.splice(0,0,
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
        "placeholder": "Tolerance (plus or minus) ",
        "tooltip": "This is the tolerance, plus or minus, around the main value. If outside this range, a warning will show.",
        "type": "number",
      },
      {
        "input": true,
        "key": "specification_minimum",
        "label": "Minimum Specification",
        "placeholder": "min",
        "tooltip": "If less than this value, a warning will show.",
        "type": "number",
      },      
      {
        "input": true,
        "key": "specification_maximum",
        "label": "Maximum Specification",
        "placeholder": "max",
        "tooltip": "If greater than than this value, a warning will show.",
        "type": "number",
      }
  );


    return form;
}


Formio.Components.addComponent('SpecNumberComponent', SpecNumberComponent);


