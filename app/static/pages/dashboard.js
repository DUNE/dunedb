// Set up sidebar animations before page load, since waiting creates an annoyingly slow flicker
if (localStorage.getItem('sidebar') === '0') {
  document.getElementById('body').classList.add('disable-animations');
  document.getElementById('sidebar').classList.add('inactive');

  requestAnimationFrame(function () {
    document.getElementById('body').classList.remove('disable-animations');
  });
}


// Functions for user interaction on the homepage
$(function () {
  // Execute a search from the navigation bar by entering a search term and then pressing the 'Enter' key
  // Note that on some pages, the navigation bar has been removed, so we must first check that the page element exists
  let navbarElement = document.getElementById('navbar-search');

  if (typeof navbarElement !== 'undefined' && navbarElement !== null) {
    navbarElement.addEventListener('keyup', function (e) {
      if (e.key === 'Enter') window.location.href = `/search/general/?${JsonURL.stringify({ search: this.value })}`;
    });
  }

  // Collapse / expand the sidebar on button click
  // Note that on some pages, the sidebar has been removed, so we must first check that the page element exists
  let sidebarElement = document.getElementById('sidebarCollapse');

  if (typeof sidebarElement !== 'undefined' && sidebarElement !== null) {
    sidebarElement.addEventListener('click', function () {
      document.getElementById('sidebar').classList.toggle('inactive');

      const state = document.getElementById('sidebar').classList.contains('inactive') ? 0 : 1;
      localStorage.setItem('sidebar', state);
    });
  }

  $(document).on('click', '[data-toggle = "lightbox"]', function (e) {
    e.preventDefault();
    $(this).ekkoLightbox({ alwaysShowClose: true });
  });
});