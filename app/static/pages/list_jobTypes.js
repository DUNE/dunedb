$('button.NewJobTypeButton').click(function()
{
  window.location.href = '/jobs/' + $('button.NewJobTypeButton').parents('.modal-content').find('input').val() + '/new';
})

$('input.NewJobTypeName').on("keyup",function(e)
{
  if(e.key === "Enter")
  {
    window.location.href = '/jobs/' + $(this).val() + '/new';
  }
})
