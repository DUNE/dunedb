



class AnnotatedImageUpload extends Formio.Components.components.file {

  static schema(...extend) {
    return super.schema({
              type: 'AnnotatedImageUpload',
              label: "Annotated Image",
              image: true,
              annotation: null
    }, ...extend);
  }

  static get builderInfo() {
    return {
      title: 'Annotated Image Upload (experimental: not working)',
      group: 'custom',
      icon: 'picture-o',
      weight: 6,
      schema: this.schema()
    };
  }


  render() {
    console.log("rendering Annotated",this.dataValue);
    var tpl = '';
    
    tpl += `<div class='annotatedDiv'>`;
    var file = (this.dataValue||[])[0];
    if(file)
      tpl += `<img ref='annotatedImg' src='${file.url}' />`
    else
      tpl += "waiting for data...";
    tpl += `</div>`;
    tpl += this.renderTemplate('file', {
      fileSize: this.fileSize,
      files: this.dataValue || [],
      statuses: this.statuses,
      disabled: this.disabled,
      support: this.support,
    });
    return Formio.Components.components.field.prototype.render.call(this,tpl)
  };

  attach(element) 
  {
    /// Called after rendering, just as the component is being inserted into the DOM.
    /// .. just like a text area...
    this.loadRefs(element, {annotatedImg: 'single'});
    var superAttach = super.attach(element);
    if(this.mark) delete this.mark;
    var self = this;
    var config = {mainColor:'#ffff00'};
    if(this.markerState) config.previousState = this.markerState;

    $(this.refs.annotatedImg).click(function(){
      self.mark = new markerjs.MarkerArea(self.refs.annotatedImg,config);
      self.mark.show(function(dataUrl,state) {
          self.refs.annotatedImg.src = dataUrl;
          self.markerState = state;
          self.dataUrl = dataUrl;
      });
    });
     
    return superAttach;
  }


   getValue() {
      return {
        file: (this.dataValue||[])[0],
        annotation: this.markerState,
        dataUrl: this.dataUrl,
      }
    }

}


// Use the table component edit form.
AnnotatedImageUpload.editForm = function(a,b,c)
{
    var form = Formio.Components.components.file.editForm();
    return form;
}


// Register the component to the Formio.Components registry.
Formio.Components.addComponent('AnnotatedImageUpload', AnnotatedImageUpload);

