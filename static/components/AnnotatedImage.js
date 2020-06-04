


var gaii = [];
class AnnotatedImage extends  Formio.Components.components.htmlelement{

  static schema(...extend) {
    return super.schema({
              type: 'AnnotatedImage',
              label: "Annotated Image",
              width: null,
              annotatedImage: {}
    }, ...extend);
  }

  static get builderInfo() {
    return {
      title: 'Annotated Image',
      group: 'custom',
      icon: 'picture-o',
      weight: 5,
      schema: this.schema()
    };
  }

  init() {
     gaii.push(this);
     return super.init();
  }

  render(element) {
    console.log("rendering AnnotatedImage",this,element);
    var tpl = '';

    var querystring = ''
    if(this.component.width) querystring='?resize='+parseInt(this.component.width);
    
    tpl += "<div class='database-imgs'>";
    var uri = this.component.annotatedImage.annotatedUrl ||   
              (this.component.annotatedImage.file||{}).url;
    if(uri) {
        // Coolness: dynamic resize.

        tpl += `<a href='${uri}' data-toggle='lightbox' data-type='image' style='min-height: 1em;'>`
        tpl += `<img src='${uri}${querystring}' class='img-fluid workstep-img' \>`;
        tpl += '</a>'

    }
    tpl += "</div>";
    return Formio.Components.components.component.prototype.render.call(this,tpl);
  };



}


// Use the table component edit form.
AnnotatedImage.editForm = function(a,b,c)
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
          "label": "Annotated Image",
          "labelPosition": "top",
          "tooltip": "Drag an image here to show it in the workflow step.  It can be annotated.",
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
          "key": "annotatedImage",
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
          "type": "ImageAnnotator"
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
Formio.Components.addComponent('AnnotatedImage', AnnotatedImage);

