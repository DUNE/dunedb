

var htmlComponent = Formio.Components.components.htmlelement;


class DatabaseFile extends htmlComponent{

  static schema(...extend) {
    return super.schema({
              type: 'DatabaseFile',
              label: "File",
              files: []
    }, ...extend);
  }

  static get builderInfo() {
    return {
      title: 'File Download',
      group: 'custom',
      icon: 'file',
      weight: 5,
      schema: this.schema()
    };
  }


  render(element) {
    // console.log("rendering",this,element);
    var tpl = '';
    
    tpl += "<div class='database-imgs' style='min-height: 1em;'>";
    var files = this.component.files || [];
    for(var file of files) {
      if(file.data && file.data.url) {
        // Coolness: dynamic resize.
        tpl += `<div>Download <a href='${file.data.url}' download>${file.name||'file'}</a></div>`
      }
    }
    tpl += "</div>";
    return Formio.Components.components.component.prototype.render.call(this,tpl);
  };



}


// Use the table component edit form.
DatabaseFile.editForm = function(a,b,c)
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
          "label": "Files",
          "labelPosition": "top",
          "tooltip": "Drag an file here to show it as a download link.  To remoe, click the (x) button next to a file. Multiple files allowed.",
          "hidden": false,
          "hideLabel": false,
          "autofocus": false,
          "disabled": false,
          "tableView": false,
          "modalEdit": false,
          "image": false,
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
          "key": "files",
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
        "input": true,
        "key": "customClass",
        "label": "Custom CSS Class",
        "placeholder": "Custom CSS Class",
        "tooltip": "Custom CSS class to add to this component.",
        "type": "textfield",
        "weight": 500
    },
  ]
    return form;
}


// Register the component to the Formio.Components registry.
Formio.Components.addComponent('DatabaseFile', DatabaseFile);

