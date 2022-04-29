$('button.NewTestTypeButton').click(function()
{
  window.location.href = '/tests/' + $('button.NewTestTypeButton').parents('.modal-content').find('input').val() + '/new';
})

$('input.NewTestTypeName').on("keyup",function(e)
{
  if(e.key === "Enter")
  {
    window.location.href = '/tests/' + $(this).val() + '/new';
  }
})
