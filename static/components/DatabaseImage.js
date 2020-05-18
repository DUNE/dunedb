

var htmlComponent = Formio.Components.components.htmlelement;


class DatabaseImage extends htmlComponent{

  static schema(...extend) {
    return super.schema({
              type: 'DatabaseImage',
              label: "Image",
              imgurl: "",
              width: null,
              imageUpload: []
    }, ...extend);
  }

  static get builderInfo() {
    return {
      title: 'Image',
      group: 'custom',
      icon: 'picture-o',
      weight: 5,
      schema: this.schema()
    };
  }


  render(element) {
    // console.log("rendering",this,element);
    var tpl = '';

    var querystring = ''
    if(this.component.width) querystring='?resize='+parseInt(this.component.width);
    
    tpl += "<div class='database-imgs'>";
    var imgs = this.component.imageUpload || [];
    for(var img of imgs) {
      if(img.data && img.data.url) {
        // Coolness: dynamic resize.

        tpl += `<a href='${img.data.url}' data-toggle='lightbox' data-type='image'>`
        tpl += `<img src='${img.data.url}${querystring}' class='img-fluid workstep-img' \>`;
        tpl += '</a>'
      }
    }
    tpl += "</div>";
    return Formio.Components.components.component.prototype.render.call(this,tpl);
  };



}


// Use the table component edit form.
DatabaseImage.editForm = function(a,b,c)
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
        input: true,
        key: "width",
        label: "Resolution (width)",
        tooltip: "Width in pixels to rescale image to. Zero for full-size.",
        type: 'number',

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
  ]
    return form;
}


// Register the component to the Formio.Components registry.
Formio.Components.addComponent('DatabaseImage', DatabaseImage);



