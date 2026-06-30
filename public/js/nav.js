// Shared mobile nav: toggle the hamburger dropdown on any page that has a
// .nav-toggle button inside a .top-nav or .member-strip.
(function () {
  function init() {
    var toggles = document.querySelectorAll('.nav-toggle');
    toggles.forEach(function (btn) {
      var nav = btn.closest('.top-nav, .member-strip');
      if (!nav) return;
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        nav.classList.toggle('open');
      });
    });
    // Tap anywhere outside an open menu to close it
    document.addEventListener('click', function (e) {
      document.querySelectorAll('.top-nav.open, .member-strip.open').forEach(function (nav) {
        if (!nav.contains(e.target)) nav.classList.remove('open');
      });
    });
  }
  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
