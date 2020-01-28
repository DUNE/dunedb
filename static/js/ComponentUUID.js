function setCoords(position)
{
    // Require the position be less than 10 minutes old.
    if(Date.now() - position.timestamp < (10*60*1000)) {
        console.log('updating frame',$('iframe.googlemap-currentpos'));
        $('iframe.googlemap-currentpos').attr('src',"https://www.google.com/maps/embed/v1/place?q="+position.coords.latitude+"%2C"+position.coords.longitude+"&key=AIzaSyDeEyg3PmVpBIVCRyak53KViUWg2-qiOpM")
        $('iframe.googlemap-currentpos').data("geotag",{...position});
        var form = $('form.geotag');
        // Set if on this page.
        $("input.latitude",form).val(  position.coords.latitude);
        $("input.longitude",form).val( position.coords.longitude);
        $("input.altitude",form).val(  position.coords.altitude);
        $("input.accuracy",form).val(  position.coords.accuracy);
        $("input.timestamp",form).val(position.timestamp);
        $('input[type=submit]',form).removeAttr('disabled');
    }
}





$(function() {
  const oldCoords = localStorage.getItem('cached-geolocation');
  if(oldCoords) {
    console.log("found cached geolocation",oldCoords);
    setCoords(JSON.parse(oldCoords));
  }

    $('form.geotag input[type=submit]').attr('disabled', 'disabled');
    if (navigator.geolocation) 
            navigator.geolocation.getCurrentPosition(pos => {
                  console.log("found current geolocation",pos);
                  const newValue = {timestamp:pos.timestamp, coords:$.extend({},pos.coords)};
                  localStorage.setItem('cached-geolocation', JSON.stringify(newValue));
                  console.log("cached",localStorage.getItem('cached-geolocation'));
                  setCoords(newValue);
                });
});



///
/// New defaults for the File schema.

Formio.Components.components.file.schema = function(...extend) {
    return {
      type: 'file',
      label: 'Upload',
      key: 'file',
      image: false,
      privateDownload: false,
      imageSize: '200',
      filePattern: '*',
      fileMinSize: '0KB',
      fileMaxSize: '1GB',
      uploadOnly: false,
      storage:"url",
      url:"/savefile",

    };
  };


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


ComponentUUID.editForm = TextFieldComponent.editForm;

Formio.Components.addComponent('ComponentUUID', ComponentUUID);


