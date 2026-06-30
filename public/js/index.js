const tabs = document.querySelectorAll('.tab-btn');
const token = localStorage.getItem("token");
const expiry = localStorage.getItem("token_expiry");

if (!token || !expiry || Date.now() > expiry) {
  localStorage.removeItem("token");
  localStorage.removeItem("token_expiry");
  window.location.replace("/login");
}


tabs.forEach(btn => {
  btn.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    btn.classList.add('active');

    document.querySelectorAll('.menu-section')
      .forEach(s => s.classList.remove('visible'));

    document.getElementById('tab-' + btn.dataset.tab)
      .classList.add('visible');
  });
});

/* ---------------- AUTH CHECK ---------------- */

fetch("/auth/me", {
  headers: { Authorization: `Bearer ${token}` }
})
  .then(res => res.json())
  .then(data => {
    if (!data.success) {
      window.location.href = "/login";
      return;
    }
    const user = data.user;

    document.getElementById("stripPts").textContent = user.points + " pts";

    if (user.birthday) {
      document.getElementById("birthday").textContent =
        new Date(user.birthday).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short"
        });
    } else {
      document.getElementById("birthday").textContent = "Not set";
    }

    const strip = document.getElementById('memberStrip');
    strip.style.display = 'flex';
    document.getElementById('stripName').textContent = 'Welcome back, ' + user.username;
    document.getElementById('stripAvatar').textContent = user.username.charAt(0).toUpperCase();
    document.getElementById('toggleName').textContent = user.username;

  });

function logout() {
  if (confirm('Are you sure you want to sign out?')) {
    localStorage.removeItem("token");
    localStorage.removeItem("token_expiry");
    localStorage.removeItem("leos_username");
    window.location.href = '/login';
  }
}

/* Profile dropdown.
   Desktop: the named pill in the strip opens the menu on hover or click.
   Mobile/touch: that pill lives in a horizontally-scrolling, overflow-clipped
   row and ends up off-screen, so the always-visible avatar (top-left) becomes
   the trigger instead. The menu is rendered position:fixed (anchored under the
   avatar) so it escapes the row's overflow clipping. */
const __profileDropdown = document.querySelector('.profile-dropdown');
const __dropdownToggle = document.querySelector('.dropdown-toggle');
const __dropdownMenu = document.querySelector('.dropdown-menu');
const __avatar = document.getElementById('stripAvatar');
const __isTouch = () => window.matchMedia('(max-width: 600px), (hover: none)').matches;

function __openMenuUnder(el) {
  const r = el.getBoundingClientRect();
  // fixed coords = viewport coords; clamp so the 160px menu stays on-screen
  const left = Math.min(r.left, window.innerWidth - 160 - 12);
  __dropdownMenu.style.position = 'fixed';
  __dropdownMenu.style.top = (r.bottom + 8) + 'px';
  __dropdownMenu.style.left = Math.max(12, left) + 'px';
  __dropdownMenu.style.right = 'auto';
  __profileDropdown.classList.add('open');
}
function __closeMenu() {
  __profileDropdown.classList.remove('open');
  __dropdownMenu.style.position = '';
  __dropdownMenu.style.top = '';
  __dropdownMenu.style.left = '';
  __dropdownMenu.style.right = '';
}

if (__profileDropdown && __dropdownMenu) {
  // Avatar: trigger on touch/narrow, plain link to /profile otherwise
  if (__avatar) {
    __avatar.addEventListener('click', (e) => {
      if (!__isTouch()) return; // desktop: let the link navigate
      e.preventDefault();
      __profileDropdown.classList.contains('open') ? __closeMenu() : __openMenuUnder(__avatar);
    });
  }
  // Desktop pill toggle (hover also works via CSS)
  if (__dropdownToggle) {
    __dropdownToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      if (__isTouch()) { __openMenuUnder(__dropdownToggle); return; }
      __profileDropdown.classList.contains('open') ? __closeMenu() : __profileDropdown.classList.add('open');
    });
  }
  // Click outside closes
  document.addEventListener('click', (e) => {
    if (!__profileDropdown.contains(e.target) && e.target !== __avatar) __closeMenu();
  });
}
