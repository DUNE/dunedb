// Sort the collection of JSON user objects alphabetically by a selected key name
function sortBy(keyName)
{
  var sortOrder = 1;
  
  if (keyName[0] === "-")
  {
    sortOrder = -1;
    keyName = keyName.substr(1);
  }
  
  return function(a, b)
  {
    if(sortOrder == -1)
    {
      return b[keyName].localeCompare(a[keyName]);
    }
    else
    {
      return a[keyName].localeCompare(b[keyName]);
    }
  }
}

$(function()
{
  $.get("/json/users").then(function(data)
  {
    var tbody = $('#users_table tbody');
    tbody.empty();
    
    data.sort(sortBy("name"));
    
    for(var u of data)
    {        
      tr = $("<tr>");
      
      tr.append(`<td>${u.name}</td>`);
      tr.append(`<td><a href = "${'mailto:' + u.email}">${u.email}</td>`);
      tr.append(`<td class = monospace>${u.user_id}</td>`);
      tr.append(`<td class = monospace>${u.roles.join(', ')}</td>`);
      
      tbody.append(tr);
      $('')
    }      
  })
})
