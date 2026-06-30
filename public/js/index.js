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

/* Profile dropdown — :hover handles desktop mouse, but touch devices have no
   hover. On narrow/touch screens the menu also lives inside a horizontally
   scrolling, overflow-clipped row, so tapping just navigates straight to the
   account page (Sign Out lives there too). On desktop, tap toggles the menu. */
const __profileDropdown = document.querySelector('.profile-dropdown');
const __dropdownToggle = document.querySelector('.dropdown-toggle');
if (__dropdownToggle && __profileDropdown) {
  __dropdownToggle.addEventListener('click', (e) => {
    if (window.matchMedia('(max-width: 600px), (hover: none)').matches) {
      window.location.href = '/profile';
      return;
    }
    e.stopPropagation();
    __profileDropdown.classList.toggle('open');
  });
  document.addEventListener('click', (e) => {
    if (!__profileDropdown.contains(e.target)) __profileDropdown.classList.remove('open');
  });
}
