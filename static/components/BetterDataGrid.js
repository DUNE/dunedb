


class BetterDataGrid extends  Formio.Components.components.datagrid
{

  static schema(...extend) {
    return super.schema({
              type: 'BeterDataGrid',
              label: "BetterDataGrid",
    }, ...extend);
  }

  static get builderInfo() {
    return {
      title: 'Beter Data Grid',
      icon: 'th',
      group: 'data',
      documentation: 'http://help.form.io/userguide/#datagrid',
      weight: 30,
      schema: Formio.Components.components.datagrid.schema()
     };
  }

 
 attach(element)
 {
    console.log("BetterDataGrid attach")
    // post-hoc some stuff:
    var superattach = super.attach(element);
    var tbody = this.refs[`${this.datagridKey}-tbody`];
    var trows = this.refs[`${this.datagridKey}-row`];
    var parent_tabindex = this.component.tabindex || 1;
    // tabindex will got down columns, not across rows.
    for(var tr of trows) {
      $('input',tr).each(function(index){

        $(this).prop('tabindex',parent_tabindex+index);
      });
    }
    $(tbody).css('overflow-x','scroll');
    return superattach;
 }

}


// Register the component to the Formio.Components registry.
Formio.Components.addComponent('BetterDataGrid', BetterDataGrid);


// Allow the enter and shift-enter keys to cyle through entries.
$(document).on('keydown', 'input, select', function(e) {

    if (e.key === "Enter") {
      console.log("my key handler");
      self = $(this);

      var form = $('body');//self.parents('form:eq(0)');

      //  Sort by tab indexes if they exist
      var tab_index = parseInt(self.attr('tabindex'));
      console.log(this);
      var input_array;

      if (tab_index) {
        input_array = form.find("[tabindex]").filter(':visible').sort(function(a, b) {
          return parseInt($(a).attr('tabindex')) - parseInt($(b).attr('tabindex'));
        });
      } else {
        input_array = form.find(['input','select','textarea','button']).filter(':visible');
      }

      // reverse the direction if using shift
      var move_direction = e.shiftKey ? -1 : 1;
      var new_index = input_array.index(this) + move_direction;

      // wrap around the controls
      if (new_index === input_array.length) {
        new_index = 0;
      } else if (new_index === -1) {
        new_index = input_array.length - 1;
      }

      var move_to = input_array.eq(new_index);
      move_to.focus();
      move_to.select();
      return false;
    }

});
// $(document).on('keydown', 'input, select', function(e) {
//     console.log(e.key,'my key handler');
//     if (e.key === "Enter") {
//         var self = $(this), form = self.parents('form:eq(0)'), focusable, next;
//         focusable = form.find('input,a,select,button,textarea').filter(':visible');
//         next = focusable.eq(focusable.index(this)+1);
//         if (next.length) {
//             next.focus();
//         } else {
//             form.submit();
//         }
//         return false;
//     }
// });
