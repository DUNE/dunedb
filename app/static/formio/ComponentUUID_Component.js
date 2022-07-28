

///
/// Custom component for UUIDs
///
/// Basically sets some good defaults for what a UUID should look like
///
/// To do: add default validation technique.
///

var TextFieldComponent = Formio.Components.components.textfield;

var gUuidComponent = null;

class ComponentUUID_Component extends QR_Component{


  static schema(...extend) {
    return TextFieldComponent.schema({
      "label": "Component UUID",
      "placeholder": "Example: 123e4567-e89b-12d3-a456-426655440000",
      "tooltip": "Component UUID. Enter manually or scan component QR code.",
      "inputMask": "********-****-****-****-************",
      "validateOn": "change",
      "validate": {
        "pattern": "^$|([0-9a-fA-F]{8}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{12})",
        "customMessage": "Must be hexadecimal in 8-4-4-4-12 layout.",
        "unique": false,
        "multiple": false
      },
      "customClass": ".component-uuid-formio",
      // "errorLabel": "Not a UUID",
      "key": "component_uuid",
      "type": "ComponentUUID",
      "showCamera": true,
      "autocomplete": true,
      "autocomplete_type": null // Component type to restrict to used when autocompleteing
    }, ...extend);
  }

  static get builderInfo() {
    return {
      title: 'Component UUID',
      group: 'custom',
      icon: 'qrcode',
      weight: 71,
      documentation: '#', 
      schema: ComponentUUID_Component.schema()
     };
  }
  get defaultSchema() {
    return ComponentUUID_Component.schema();
  }



  attach(element) 
  {
    /// Called after rendering, just as the component is being inserted into the DOM.
    /// .. just like a text area...
    var superattach = super.attach(element);
    var self = this; // for binding below

    if(this.component.autocomplete ) {
      var url = this.component.autocomplete;
      var query = {};
      if(this.component.autocomplete_type) query.formName = this.component.autocomplete_type;

      $(this.refs.input).each(function(index) {
        $(this).autoComplete({
              resolver: 'custom',
              events: {
                  search: function (qry, callback) {
                      // let's do a custom ajax call
                      $.ajax(
                          '/autocomplete/uuid',
                          {
                              data: {...query,'q': qry}
                          }
                      ).done(callback);
                  }
              },

              resolverSettings: {
                minLength: 2,
                // url: String(self.component.autocomplete)
              }
        }).on('autocomplete.select', function (evt, item) {
          // console.log("autocomplete select",item.val,item.text);
          $(this).val(item.val);
          console.log('setting index',index,item.val,this);
          self.setValueAt(index,item.val);
          self.updateValue();
        });
      })
    }

    return superattach;
  }


  cameraCallback(index, qrcode) {
    const match_address = qrcode.match('.*/([123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ-]{22})');

    if (match_address) {
      const shortuuid = match_address[1].match('[^\-]*')[0];
      const uuid58 = ShortUUID().toUUID(shortuuid);
      const uuid57 = ShortUUID('23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz').toUUID(shortuuid);

      const thisClass = this;
      let uuid, foundMatchingComponent58 = false, foundMatchingComponent57 = false;

      function checkUuid(uuid, base) {
        return $.ajax({
          type: 'GET',
          url: `/json/component/${uuid}`,
          dataType: 'json',
          success: function(data) {
            if (data) {
              if (base === 58) foundMatchingComponent58 = true;
              else foundMatchingComponent57 = true;
            }
          },
        })
      }

      jQuery.when(checkUuid(uuid58, 58), checkUuid(uuid57, 57)).done(function () {
        if (foundMatchingComponent58 && !foundMatchingComponent57) {
          uuid = uuid58;
          console.log('Found component matching only base58 UUID: ', uuid);
        }

        if (foundMatchingComponent57 && !foundMatchingComponent58) {
          uuid = uuid57;
          console.log('Found component matching only base57 UUID: ', uuid);
        }

        if (foundMatchingComponent57 && foundMatchingComponent58) {
          uuid = uuid58;
          console.log('Found components matching both base58 and base57 UUIDs ... using base58 as default query');
        }

        if (!foundMatchingComponent57 && !foundMatchingComponent58) {
          uuid = uuid58;
          console.log('Found no components matching either base58 and base57 UUIDs ... using base58 for query to fail');
        }

        thisClass.setValueAt(index, uuid);
        return true;
      });
    }

    return true;
  }


  setValueAt(index, value,flags) {
    // flags = flags || {};
    const changed = super.setValueAt.call(this, index, value);

    // if(this.refs.linkToComponent && value && value.length==36) {
    //   $(this.refs.linkToComponent).show().prop('href','/'+value).text('link');
    // }
    if(this.refs.compUuidInfo && value && value.length==36) {
      $.get('/json/component/'+value);
    }

    return changed;
  }

}

// ComponentUUID_Component.editForm = TextFieldComponent.editForm;
ComponentUUID_Component.editForm = function(a,b,c)
{
    var form = TextFieldComponent.editForm(a,b,c);
    var tabs = form.components.find(obj => { return obj.type === "tabs" });
    var datatab = tabs.components.find(obj => {return obj.key=='data'});

    // Remove 'multiple components'. I could probably make it work.. but nah
    datatab.components.splice(datatab.components.findIndex(obj=>{return obj.key = "multiple"}),1);
    var displaytab = tabs.components.find(obj => {return obj.key=='display'});

    datatab.components.splice(1,0,
      {
        "input": true,
        "key": "autocomplete_type",
        "label": "Restrict Autocomplete to type",
        "tooltip": "Restrict autocomplete results to this form type",
        "type": "textfield",
      }
  );


    return form;
}

Formio.Components.addComponent('ComponentUUID', ComponentUUID_Component);


