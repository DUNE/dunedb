var DataGridComponent = Formio.Components.components.datagrid;

/// This class describes a custom Formio component for a data grid
/// It extends the built-in 'datagrid' Formio component by adding the ability to cycle through entries via keyboard input
class BetterDataGrid extends DataGridComponent {

  // Base schema for the component (the built-in 'datagrid' Formio component)
  static schema(...extend) {
    return DataGridComponent.schema({
      type: 'BetterDataGrid',
      label: "Better Data Grid",
    }, ...extend);
  }

  // Getter functions
  static get builderInfo() {
    return {
      title: 'Better Data Grid',
      icon: 'th',
      group: 'data',
      documentation: 'http://help.form.io/userguide/#datagrid',
      weight: 30,
      schema: BetterDataGrid.schema()
    };
  }

  constructor(...args) {
    super(...args);
    this.type = 'BetterDataGrid';
  }

  // After rendering the Formio component, attach it to an element of the page
  attach(element) {
    $('.formio-component-BetterDataGrid', element).addClass('formio-component-datagrid');

    return super.attach(element);
  }
}


/// Register this custom Formio component with the overall list of components that are available to use in Formio forms
Formio.Components.addComponent('BetterDataGrid', BetterDataGrid);


// Allow the 'Enter' and 'Shift + Enter' keyboard inputs to cycle through entries in the data grid
$(document).on('keydown', 'input, select', function (e) {
  if (e.key === 'Enter') {
    self = $(this);

    const form = $('body');

    //  Sort elements in the data grid by tab indices (if they exist)
    const tab_index = parseInt(self.attr('tabindex'));
    let input_array;

    if (tab_index) {
      input_array = form.find('[tabindex]').filter(':visible').sort(function (a, b) {
        return parseInt($(a).attr('tabindex')) - parseInt($(b).attr('tabindex'));
      });
    } else {
      input_array = form.find(['input', 'select', 'textarea', 'button']).filter(':visible');
    }

    // Reverse the cycling direction if the 'Shift' key is also pressed
    const move_direction = e.shiftKey ? -1 : 1;
    let new_index = input_array.index(this) + move_direction;

    // Wrap around the elements in the data grid
    if (new_index === input_array.length) {
      new_index = 0;
    } else if (new_index === -1) {
      new_index = input_array.length - 1;
    }

    let move_to = input_array.eq(new_index);
    move_to.focus();
    move_to.select();

    return false;
  }
});
