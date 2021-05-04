function executeASearch(term) {
        //- console.log("Execute a Search:",term);
        window.location.href = `/search?`+JsonURL.stringify({search:term});
};

$(function(){
    $("#navbar-search")
    .on('change',function(){
      executeASearch($(this).val());
    })
    .on('keyup',function(){
      if (event.key === "Enter") executeASearch($(this).val());
    });


    $('#sidebarCollapse').on('click', function () {
        $('#sidebar').toggle();
    });

    $(document).on('click', '[data-toggle="lightbox"]', function(event) {event.preventDefault();$(this).ekkoLightbox({alwaysShowClose: true});});

});