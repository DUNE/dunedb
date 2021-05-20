function executeASearch(term) {
        //- console.log("Execute a Search:",term);
        window.location.href = `/search?`+JsonURL.stringify({search:term});
};


// Don't wait for document-load since it creates an annoyingly slow flicker
console.log('sidebar state on load:',localStorage.getItem('sidebar'));
if (localStorage.getItem('sidebar') === '0') {
    $('body').addClass('disable-animations');
    $('#sidebar').addClass('inactive');
    requestAnimationFrame(function () {
        $('body').removeClass('disable-animations');
    });
}

$(function(){
    $("#navbar-search")
    .on('change',function(){
      executeASearch($(this).val());
    })
    .on('keyup',function(){
      if (event.key === "Enter") executeASearch($(this).val());
    });




    $('#sidebarCollapse').on('click', function () {
        // $('#sidebar').toggle();
       $('#sidebar').toggleClass("inactive");
       var state = $('#sidebar').hasClass('inactive') ? 0 : 1;
       console.log("sidebar save state",state)
       localStorage.setItem('sidebar', state);

        // document.getElmentById("sidebar").classList.toggle("closed");
    });

    $(document).on('click', '[data-toggle="lightbox"]', function(event) {event.preventDefault();$(this).ekkoLightbox({alwaysShowClose: true});});

});