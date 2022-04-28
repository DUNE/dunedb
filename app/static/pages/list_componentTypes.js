$('button.NewComponentTypeButton').click(function()
{
  window.location.href = "/components/" + $('button.NewComponentTypeButton').parents('.modal-content').find('input').val() + "/new";
})

$('input.NewComponentTypeName').on("keyup", function(e)
{
  if(e.key === "Enter") 
  {
    window.location.href = "/components/" + $(this).val() + "/new";
  }
})
