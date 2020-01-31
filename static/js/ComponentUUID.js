

///
/// Custom component for UUIDs
///
/// Basically sets some good defaults for what a UUID should look like
///
/// To do: add default validation technique.
///


// Formio.Components.components.file.builderInfo.schema=Formio.Components.components.file.schema();
var TextFieldComponent = Formio.Components.components.textfield;

function ComponentUUID(component, options, data) {
  // This is a normal text field...
  TextFieldComponent.prototype.constructor.call(this, component, options, data);

  // Except that after inserting into the DOM, we want to instantiate the autocomplete object.
  // Note that options.hooks is completely undocumented, but messing with Element.js hook() let 
  // me figure out how this works.
  // options=options||{};
  // options.hooks = options.hooks || {};
  // options.hooks.attachComponentUUID = function(element,component) {
  // $('input',element).autoComplete({
  //   resolverSettings: {
  //     minLength: 3,
  //       url: '/autocomplete/uuid'
  //   }
  // }).on('autocomplete.select', function (evt, item) {
  //   // console.log("selected",item)
  //   component.setValue(item.val);
  // });
  // console.log("hooked!",element,component);
  // }

  // console.log("ctor",options);
}

// Perform typical ES5 inheritance
ComponentUUID.prototype = Object.create(TextFieldComponent.prototype);
ComponentUUID.prototype.constructor = ComponentUUID;

ComponentUUID.schema = function() {
  return TextFieldComponent.schema({
      "label": "Component UUID",
      "placeholder": "Example: 123e4567-e89b-12d3-a456-426655440000",
      "description": "Database UUID. Found on QR code.",
      "inputMask": "********-****-****-****-************",
      "validateOn": "blur",
      "validate": {
        "pattern": "^$|([0-9a-fA-F]{8}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{12})",
        "customMessage": "Needs to be hexadecimal in 8-4-4-4-12 layout",
        "unique": false,
        "multiple": false
      },
      "customClass": ".component-uuid-formio",
      "errorLabel": "Not a UUID",
      "key": "component_uuid",
      "type": "ComponentUUID",
      "input": true  
    });
};
ComponentUUID.builderInfo = {
  title: 'ComponentUUID',
  group: 'custom',
  icon: 'qrcode',
  weight: 71,
  documentation: '#', 
  schema: ComponentUUID.schema()
};


ComponentUUID.prototype.renderElement = function(value,index) 
{
  var tpl = "<a class='uuid-link'></a>";
  return TextFieldComponent.prototype.renderElement.call(this,value,index)+tpl;
}

ComponentUUID.prototype.attach = function(element) 
{
  /// Called after rendering, just as the component is being inserted into the DOM.
  /// .. just like a text area...
  TextFieldComponent.prototype.attach.call(this,element);
  // console.log('my attach',this,this.refs.input,element)
 
 // Except that after inserting into the DOM, we want to instantiate the autocomplete object.
 
  var component = this; // for binding below
  $('input',element).autoComplete({
    resolverSettings: {
      minLength: 3,
        url: '/autocomplete/uuid'
    }
  }).on('autocomplete.select', function (evt, item) {
    // console.log("selected",item)
    component.setValue(item.val);
  });
}

ComponentUUID.setValue = function(value)
{
  console.log(setValue,this);
  if(this.options && this.options.readOnly) {
    $('a',this.element).attr('href','/'+value).text(value);
  } else {
    return TextFieldComponent.prototype.setValue.call(this,value);
  }
}


ComponentUUID.editForm = TextFieldComponent.editForm;

Formio.Components.addComponent('ComponentUUID', ComponentUUID);


