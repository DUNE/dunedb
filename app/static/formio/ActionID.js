var TextFieldComponent = Formio.Components.components.textfield;
var gActionIDComponent = null;


/// This class describes a custom Formio component for inputting an action ID
/// It extends the built-in 'text field' Formio component
class ActionID extends TextFieldComponent {

  // Base schema for the component (the built-in 'text field' Formio component)
  static schema(...extend) {
    return TextFieldComponent.schema({
      label: 'Action ID',
      placeholder: 'Example: 507f191e810c19729de860ea',
      tooltip: 'Action ID ... enter manually',
      inputMask: '************************',
      validateOn: 'change',
      validate: {
        pattern: '^$|([0-9a-fA-F]{24})',
        customMessage: 'Must be a string in the format: [24] characters',
        unique: false,
        multiple: false,
      },
      customClass: '.component-actionid-formio',
      key: 'action_id',
      type: 'ActionID',
      autocomplete: true,
    }, ...extend);
  }

  // Getter functions
  static get builderInfo() {
    return {
      title: 'Action ID',
      group: 'custom',
      icon: 'check-square-o',
      weight: 71,
      documentation: '#',
      schema: ActionID.schema()
    };
  }

  get defaultSchema() {
    return ActionID.schema();
  }

  // Render the component as an element on the page
  renderElement(value, index) {
    gActionIDComponent = this;
    let textValue = value;

    if (value && typeof value === 'object') textValue = value.objectid;

    textValue = textValue || '';

    let tpl = `
      <div class = 'actionid'>
        <div class = 'main-input'>
          ${super.renderElement(textValue, index)}
        </div>
      </div>
      <a target = '_blank' ref = 'actionIdInfo' class = 'actionid-info'></a>`;

    return tpl;
  }

  // After rendering the Formio component, attach it to an element of the page
  attach(element) {
    const superattach = super.attach(element);
    this.loadRefs(element, { actionIdInfo: 'multiple' });
    let self = this;

    if (this.component.autocomplete) {
      let query = {};

      $(this.refs.input).each(function (index) {
        $(this).autoComplete({
          resolver: 'custom',
          events: {
            search: function (qry, callback) {
              $.ajax(
                '/autocomplete/actionId', { data: { ...query, 'q': qry } }
              ).done(callback);
            }
          },
          resolverSettings: {
            minLength: 2,
          }
        }).on('autocomplete.select', function (evt, item) {
          $(this).val(item.val);
          self.setValueAt(index, item.val);
          self.updateValue();
        });
      })
    }

    return superattach;
  }

  // Set the input field to a provided string, and if it is a valid ID string, automatically redirect to the action information page
  // Note that the redirect should only be performed if this Formio component is being used on the 'Search for Record by UUID or ID' page ...
  // ... if not, i.e. if it is part of a type form, then do not redirect if an ID is inputted
  setValueAt(index, value, flags) {
    const changed = super.setValueAt.call(this, index, value);

    if (this.refs.actionIdInfo && value && value.length === 24) {
      $.get(`/json/action/${value}`);

      if (window.location.pathname === '/search/byUUIDorID') window.location.href = `/action/${value}`;
    }

    return changed;
  }
}


/// Function for updating the selection of available Formio components to include this one (on any 'Edit Type Form' page)
ActionID.editForm = function (a, b, c) {
  const form = TextFieldComponent.editForm(a, b, c);
  const tabs = form.components.find(obj => { return obj.type === 'tabs' });
  let dataTab = tabs.components.find(obj => { return obj.key == 'data' });

  dataTab.components.splice(dataTab.components.findIndex(obj => { return obj.key = 'multiple' }), 1);
  
  return form;
}


/// Register this custom Formio component with the overall list of components that are available to use in Formio forms
Formio.Components.addComponent('ActionID', ActionID);
