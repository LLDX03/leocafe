const tabs = document.querySelectorAll('.tab-btn');
const token = localStorage.getItem("token");
const expiry = localStorage.getItem("token_expiry");

if (!token || !expiry || Date.now() > expiry) {
  localStorage.removeItem("token");
  localStorage.removeItem("token_expiry");
  window.location.replace("/views/login.html");
}
if (Date.now() > expiry) {
  localStorage.removeItem("token");
  localStorage.removeItem("token_expiry");
  window.location.href = "/views/login.html";
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

fetch("http://localhost:3000/auth/me", {
  headers: { Authorization: `Bearer ${token}` }
})
  .then(res => res.json())
  .then(data => {
    if (!data.success) {
      window.location.href = "/views/login.html";
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

    console.log("User data:", user);
  });