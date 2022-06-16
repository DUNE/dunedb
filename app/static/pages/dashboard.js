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
  document.getElementById('navbar-search').addEventListener('keyup', function (e) {
    if (e.key === 'Enter') window.location.href = `/search?${JsonURL.stringify({ search: this.value })}`;
  });

  // Collapse / expand the sidebar on button click
  document.getElementById('sidebarCollapse').addEventListener('click', function () {
    document.getElementById('sidebar').classList.toggle('inactive');
    
    const state = document.getElementById('sidebar').classList.contains('inactive') ? 0 : 1;
    localStorage.setItem('sidebar', state);
  });

  document.on('click', '[data-toggle = "lightbox"]', function (e) {
    e.preventDefault();
    this.ekkoLightbox({ alwaysShowClose: true });
  });
});