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
});
