const username = localStorage.getItem('leos_username');
if (username) {
    document.getElementById('cardName').textContent = username;
}
let pts = parseInt(localStorage.getItem('leos_points') || '240');
function updatePts() {
    document.getElementById('cardPts').textContent = pts;
    const pct = Math.min(Math.round((pts / 300) * 100), 100);
    document.getElementById('progressFill').style.width = pct + '%';
    document.getElementById('progressPct').textContent = pct + '%';
    localStorage.setItem('leos_points', pts);
}
updatePts();

function redeem(btn, cost, name) {
    if (pts < cost) { showToast('Not enough points!'); return; }
    pts -= cost;
    updatePts();
    btn.textContent = 'Redeemed!';
    btn.disabled = true;
    // add to history
    const list = document.getElementById('historyList');
    const item = document.createElement('div');
    item.className = 'history-item';
    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    item.innerHTML = `<div class="history-icon redeem"><i class="ti ti-award"></i></div><div class="history-info"><div class="history-name">Redeemed — ${name}</div><div class="history-date">${today}</div></div><div class="history-pts redeem">−${cost} pts</div>`;
    list.prepend(item);
    showToast('☕ ' + name + ' redeemed! Show this at the counter.');
}

function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}