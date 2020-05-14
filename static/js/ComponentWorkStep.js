

var htmlComponent = Formio.Components.components.htmlelement;


class WorkStepComponent extends htmlComponent{

  static schema(...extend) {
    return super.schema({
              type: 'WorkStepComponent',
              label: "Work Step",
              imgurl: "",
              worktext: "",
              imageUpload: [],
    }, ...extend);
  }

  static get builderInfo() {
    return {
      title: 'Work Step',
      group: 'custom',
      icon: 'sort-numeric-asc',
      weight: 70,
      documentation: '#', 
      schema: this.schema()
    };
  }


  render(element) {
    // console.log("rendering",this,element);
    var tpl = '';
    // tpl += this.renderTemplate('label', {
    //   label: this.labelInfo,
    //   component: this.component,
    //   element: element,
    //   tooltip: this.interpolate(this.component.tooltip || '').replace(/(?:\r\n|\r|\n)/g, '<br />'),
    // });

    console.log("trying to render ",this);
    // var imgurl = (((this.component.imageUpload||{}).data||{}).url||null);
    
    tpl += "<div class='workstep-img'>";
    var imgs = this.component.imageUpload || [];
    for(var img of imgs) {
      if(img.data && img.data.url) {
        tpl += "<img src='" + img.data.url + "' class='img-fluid workstep-img'>";
      }
    }
    if(this.component.imgurl && this.component.imgurl.length>0) {
        tpl += "<img src='" + this.component.imgurl + "' class='img-fluid workstep-img'>";    
    }

    tpl += "</div>";
    tpl += "<div class='workstep-text'>"+this.component.worktext+"</div>";
    console.log("tpl",tpl);
    return Formio.Components.components.component.prototype.render.call(this,tpl);
  };



}

// ///
// /**
//  * Get the input component class by referencing Formio.Components.components map.
//  */
// var htmlComponent = Formio.Components.components.htmlelement;

// function WorkStepComponent(component, options, data) {
//   htmlComponent.prototype.constructor.call(this, component, options, data);
// }

// // Perform typical ES5 inheritance
// WorkStepComponent.prototype = Object.create(htmlComponent.prototype);
// WorkStepComponent.prototype.constructor = WorkStepComponent;

// /**
//  * Define what the default JSON schema for this component is. We will derive from the InputComponent
//  * schema and provide our overrides to that.
//  * @return {*}
//  */
// WorkStepComponent.schema = function() {
//   return htmlComponent.schema({
//     type: 'WorkStepComponent',
//     label: "Work Step",
//     imgurl: "",
//     worktext: "",
//     imageUpload: [],
//   });
// };

// /**
//  * Register this component to the Form Builder by providing the "builderInfo" object.
//  * 
//  * @type {{title: string, group: string, icon: string, weight: number, documentation: string, schema: *}}
//  */
// WorkStepComponent.builderInfo = {
//   title: 'Work Step',
//   group: 'custom',
//   icon: 'globe',
//   weight: 0,
//   documentation: '#', 
//   schema: WorkStepComponent.schema()
// };

// /**
//  *  Tell the renderer how to render this component.
//  */
// WorkStepComponent.prototype.render = function(element) {
//   // console.log("rendering",this,element);
//   var tpl = '';
//   tpl += this.renderTemplate('label', {
//     label: this.labelInfo,
//     component: this.component,
//     element: element,
//     tooltip: this.interpolate(this.component.tooltip || '').replace(/(?:\r\n|\r|\n)/g, '<br />'),
//   });

//   console.log("trying to render ",this);
//   // var imgurl = (((this.component.imageUpload||{}).data||{}).url||null);
  
//   tpl += "<div class='workstep-img'>";
//   var imgs = this.component.imageUpload || [];
//   for(img of imgs) {
//     if(img.data && img.data.url) {
//       tpl += "<img src='" + img.data.url + "' class='img-fluid workstep-img'>";
//     }
//   }
//   if(this.component.imgurl && this.component.imgurl.length>0) {
//       tpl += "<img src='" + this.component.imgurl + "' class='img-fluid workstep-img'>";    
//   }

//   tpl += "</div>";
//   tpl += "<p>" + this.component.worktext + "</p>";
//   return Formio.Components.components.component.prototype.render.call(this,tpl);

// };


// Use the table component edit form.
WorkStepComponent.editForm = function(a,b,c)
{
    var form = htmlComponent.editForm(a,b,c);
    console.log("editform");
    console.log(form);
    var tabs = form.components.find(obj => { return obj.type === "tabs" });
    var displaytab = tabs.components.find(obj => {return obj.key=='display'});
    displaytab.components = [
    // {
    //     "input": true,
    //     "key": "label",
    //     "label": "Label",
    //     "placeholder": "Field Label",
    //     "tooltip": "The label for this field that will appear next to it.",
    //     "type": "textfield",
    //     "validate": {
    //         "required": true
    //     },
    //     "weight": 0
    // },

     {
          "label": "Images",
          "labelPosition": "top",
          "tooltip": "Drag an image here to show it in the workflow step.  To replace an image, drag the new one here, and then press the (x) button next to the old one to remove it. M",
          "hidden": false,
          "hideLabel": false,
          "autofocus": false,
          "disabled": false,
          "tableView": false,
          "modalEdit": false,
          "image": true,
          "webcam": false,
          "fileTypes": [
            {
              "label": "",
              "value": ""
            }
          ],
          "multiple": false,
          "persistent": true,
          "protected": false,
          "dbIndex": false,
          "encrypted": false,
          "clearOnHide": true,
          "allowCalculateOverride": false,
          "validate": {
            "required": false,
            "customMessage": "",
            "custom": "",
            "customPrivate": false,
            "json": "",
            "multiple": false
          },
          "key": "imageUpload",
          "properties": {},
          "conditional": {
            "show": "",
            "when": "",
            "eq": "",
            "json": ""
          },
          "attributes": {},
          "overlay": {
            "style": "",
            "page": "",
            "left": "",
            "top": "",
            "width": "",
            "height": ""
          },
          "type": "file"
        },


    // {
    //     "input": true,
    //     "key": "imgurl",
    //     "label": "Image URL",
    //     "placeholder": "http://place/thinkg.jpg",
    //     "tooltip": "URL to the image we want to see",
    //     "type": "textfield",
    //     "weight": 50
    // },
    {
        "type": "textarea",
        "label": "Instructions",
        "wysiwyg": true,
        "key": "content",
        "input": true,
        "key": "worktext",
        "label": "Text Description",
        "rows": 10,
        "weight": 80
    },
    {
        "input": true,
        "key": "refreshOnChange",
        "label": "Refresh On Change",
        "tooltip": "Rerender the field whenever a value on the form changes.",
        "type": "checkbox",
        "weight": 85
    },
    {
        "input": true,
        "key": "customClass",
        "label": "Custom CSS Class",
        "placeholder": "Custom CSS Class",
        "tooltip": "Custom CSS class to add to this component.",
        "type": "textfield",
        "weight": 500
    },
    {
        "input": true,
        "key": "hidden",
        "label": "Hidden",
        "tooltip": "A hidden field is still a part of the form, but is hidden from view.",
        "type": "checkbox",
        "weight": 1100
    },
    {
        "input": true,
        "key": "dataGridLabel",
        "label": "Show Label in DataGrid",
        "tooltip": "Show the label when in a Datagrid.",
        "type": "checkbox",
        "weight": 1370
    },
    {
        "input": true,
        "key": "tableView",
        "label": "Table View",
        "tooltip": "Shows this value within the table view of the submissions.",
        "type": "checkbox",
        "weight": 1500
    },
    {
        "input": true,
        "key": "modalEdit",
        "label": "Modal Edit",
        "tooltip": "Opens up a modal to edit the value of this component.",
        "type": "checkbox",
        "weight": 1600
    }
]
    return form;
}


// Register the component to the Formio.Components registry.
Formio.Components.addComponent('WorkStepComponent', WorkStepComponent);



