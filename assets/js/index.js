const tabs = document.querySelectorAll('.tab-btn');
tabs.forEach(btn => {
  btn.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.menu-section').forEach(s => s.classList.remove('visible'));
    document.getElementById('tab-' + btn.dataset.tab).classList.add('visible');
  });
});

const username = localStorage.getItem('leos_username');
if (username) {
  const strip = document.getElementById('memberStrip');
  strip.style.display = 'flex';
  document.getElementById('stripName').textContent = 'Welcome back, ' + username;
  document.getElementById('stripAvatar').textContent = username.charAt(0).toUpperCase();
  // Points: stored or default
  const pts = localStorage.getItem('leos_points') || '240';
  document.getElementById('stripPts').textContent = pts + ' pts';
}