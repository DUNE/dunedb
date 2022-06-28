// Function for sorting a collection of JSON objects alphabetically by a selected key name
function sortBy(keyName) {
  let sortOrder = 1;

  if (keyName[0] === '-') {
    sortOrder = -1;
    keyName = keyName.substr(1);
  }

  return function (a, b) {
    if (sortOrder == -1) {
      return b[keyName].localeCompare(a[keyName]);
    } else {
      return a[keyName].localeCompare(b[keyName]);
    }
  }
}

// Function for populating the table of users with information, with the users listed in alphabetical order
$(function () {
  // Retrieve a list of the users for this Auth0 tenant, and then ...
  $.get('/json/users/list').then(function (data) {
    // Set the body of the table of users as the body of the 'users_table' page element
    let tbody = $('#users_table tbody');
    tbody.empty();

    // Sort the list of users alphabetically
    data.sort(sortBy('name'));

    // For each user in the list ...
    for (const u of data) {
      // Create a string that contains all of the information to be displayed about the user
      tr = $('<tr>');

      tr.append(`<td>${u.name}</td>`);
      tr.append(`<td><a href = mailto:${u.email}>${u.email}</td>`);
      tr.append(`<td class = monospace>${u.user_id}</td>`);
      tr.append(`<td class = monospace>${u.roles.join(', ')}</td>`);

      // Append the string to the table body
      tbody.append(tr);
      $('')
    }
  })
})
