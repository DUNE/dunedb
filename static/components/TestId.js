

///
/// Custom component for UUIDs
///
/// Basically sets some good defaults for what a UUID should look like
///
/// To do: add default validation technique.
///

var TextFieldComponent = Formio.Components.components.textfield;

var gTestIdComponent = null;

class TestIdComponent extends TextFieldComponent{


  static schema(...extend) {
    return TextFieldComponent.schema({
      "label": "Test ID",
      "placeholder": "Example: 507f191e810c19729de860ea",
      "tooltip": "ID number of a unique test in the Sietch database",
      // "inputMask": "************************",
      "validateOn": "change",
      "validate": {
        "pattern": "^$|([0-9a-fA-F]{24})",
        "customMessage": "Needs to be hexadecimal 24 characters layout",
        "unique": false,
        "multiple": false
      },
      "customClass": ".component-testid-formio",
      // "errorLabel": "Not a UUID",
      "key": "test_id",
      "type": "TestIdComponent",
      "input": true,
      "autocomplete": "/autocomplete/testId", // set to null to cancel
      "formId": "", // Set to restrict autocomplete text to this type.
    }, ...extend);
  }

  static get builderInfo() {
    return {
      title: 'Test ID',
      group: 'custom',
      icon: 'check-square-o',
      weight: 71,
      documentation: '#', 
      schema: TestIdComponent.schema()
     };
  }
  get defaultSchema() {
    return TestIdComponent.schema();
  }

  renderElement(value,index)  {
    gTestIdComponent = this;
    // console.log('renderElement',this,value,index);
    var textvalue = value;
    if(value && typeof value === "object") {
      textvalue = value.objectid;
    }
    textvalue = textvalue || '';

    var tpl = "<div class='TestIdComponent'>"; 
    tpl += "<div class='main-input'>";
    tpl += super.renderElement(textvalue,index);
    tpl += "</div>";
    // tpl += `<a href="${value}" ref='linkToComponent' class="uuid-link" ></a>`;
    tpl += "</div>";
    tpl += "<a target='_blank' ref='testIdComponentInfo' class='TestId-info text-truncate'></a>";
    return tpl;
    // return TextFieldComponent.prototype.renderElement.call(this,textvalue,index)+tpl;
  }

  attach(element) 
  {
    /// Called after rendering, just as the component is being inserted into the DOM.
    /// .. just like a text area...
    var superattach = super.attach(element);
    // console.log('my attach',this,this.refs.input,element,$(this.refs.input[0]).val());
    this.loadRefs(element, {//linkToComponent: 'single',
                            testIdComponentInfo: 'multiple',
                           });

    var self = this; // for binding below


    console.log("refs.input",this.refs.input);
    if(this.component.autocomplete && this.component.autocomplete.length>0) {
      var url = this.component.autocomplete;
      var query = {};
      if(this.component.formId) query.formId = this.component.formId;

      $(this.refs.input).each(function(index) {
        $(this).autoComplete({
              resolver: 'custom',
              events: {
                  search: function (qry, callback) {
                      // let's do a custom ajax call
                      $.ajax(
                          url,
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

 setValueAt(index, value,flags) {
    // flags = flags || {};
    const changed = super.setValueAt.call(this, index, value);

    // if(this.refs.linkToComponent && value && value.length==36) {
    //   $(this.refs.linkToComponent).show().prop('href','/'+value).text('link');
    // }
    if(this.refs.testIdComponentInfo && value && value.length==24) {
      var info_target = $(this.refs.testIdComponentInfo[index]);
      info_target.show().prop('href','/test/'+value).text('link');
      console.log("retrieving info for test",value)
      $.get('/json/test/'+value+"/info").then(function(info){
        var txt = "";
        if(info.icon) txt+=`<img class='small-icon' src='${info.icon}'/>`;
        txt += info.formName + " " + moment(info.insertion.insertDate).format("YYYY-MM-DD");
        info_target.html(txt);
      })
    }
    return changed;
  }

}

// TestIdComponent.editForm = TextFieldComponent.editForm;
TestIdComponent.editForm = function(a,b,c)
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
        "key": "autocomplete",
        "label": "Autocomplete URL",
        "tooltip": "Blank for no autocomplete",
        "type": "textfield",
      },
      {
        "input": true,
        "key": "formId",
        "label": "formId",
        "tooltip": "Restrict autocomplete results to this form type",
        "type": "textfield",
      }
  );


    return form;
}
Formio.Components.addComponent('TestIdComponent', TestIdComponent);


