const token = localStorage.getItem("token");
const expiry = localStorage.getItem("token_expiry");

if (!token || !expiry || Date.now() > expiry) {
  localStorage.removeItem("token");
  localStorage.removeItem("token_expiry");
  window.location.replace("/login");
}

let pts = 0;
let totalPts = 0;
let userTier = "Bronze";



// Tier config
const TIER_CONFIG = {
  Bronze: { discount: 0,    next: 1000, label: "Bronze" },
  Silver: { discount: 0.05, next: 5000, label: "Silver" },
  Gold:   { discount: 0.10, next: null, label: "Gold"   }
};

fetch("/auth/me", {
  headers: { Authorization: `Bearer ${token}` }
})
  .then(res => res.json())
  .then(data => {
    if (!data.success) { window.location.href = "/login"; return; }

    const user = data.user;
    pts = user.points;
    totalPts = user.total_points || user.points;
    userTier = user.tier || "Bronze";

    document.getElementById("cardName").textContent = user.username;

    const memberYear = user.createdAt
      ? new Date(user.createdAt).getFullYear()
      : new Date().getFullYear();
    document.querySelector('.card-greeting').textContent = `Member since ${memberYear}`;

    if (user.birthday) {
      document.getElementById("birthday").textContent =
        new Date(user.birthday).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    } else {
      document.getElementById("birthday").textContent = "Not set";
    }

    document.getElementById("tier").textContent = userTier;

    updatePts();
    updateRewardCards();
    loadHistory();
  })
  .catch(() => showToast("Failed to load user data"));

function updatePts() {
  document.getElementById('cardPts').textContent = pts;

  const config = TIER_CONFIG[userTier];
  const nextTierPts = config.next;

  if (nextTierPts) {
    const pct = Math.min(Math.round((totalPts / nextTierPts) * 100), 100);
    document.getElementById('progressFill').style.width = pct + '%';
    document.getElementById('progressPct').textContent = pct + '%';
    document.querySelector('.progress-label span').textContent =
      `${totalPts} / ${nextTierPts} pts to ${userTier === 'Bronze' ? 'Silver' : 'Gold'}`;
  } else {
    // Gold â€” max tier
    document.getElementById('progressFill').style.width = '100%';
    document.getElementById('progressPct').textContent = 'Max';
    document.querySelector('.progress-label span').textContent = 'Gold tier — maximum tier reached';
  }
}

function getDiscountedCost(baseCost) {
  const discount = TIER_CONFIG[userTier]?.discount || 0;
  return Math.round(baseCost * (1 - discount));
}

function updateRewardCards() {
  const discount = TIER_CONFIG[userTier]?.discount || 0;

  document.querySelectorAll('.reward-card').forEach(card => {
    const costEl = card.querySelector('.reward-cost');
    if (!costEl) return;

    const baseCost = parseInt(card.dataset.baseCost);
    if (!baseCost) return;

    const finalCost = getDiscountedCost(baseCost);
    const btn = card.querySelector('.btn-redeem');

    if (discount > 0) {
      costEl.innerHTML = `
        <i class="ti ti-star"></i>
        <span style="text-decoration:line-through;opacity:0.5;margin-right:4px;">${baseCost}</span>
        <span style="color:var(--sage-deep);font-weight:500;">${finalCost} pts</span>
        <span style="font-size:9px;background:rgba(61,92,66,0.1);color:var(--sage-deep);padding:2px 6px;border-radius:4px;margin-left:4px;">${Math.round(discount*100)}% off</span>
      `;
    } else {
      costEl.innerHTML = `<i class="ti ti-star"></i> ${baseCost} pts`;
    }

    if (pts >= finalCost) {
      btn.disabled = false;
      card.classList.remove('locked');
      const lockBadge = card.querySelector('.lock-badge');
      if (lockBadge) lockBadge.remove();
    } else {
      btn.disabled = true;
      card.classList.add('locked');
      if (!card.querySelector('.lock-badge')) {
        const badge = document.createElement('div');
        badge.className = 'lock-badge';
        badge.innerHTML = `<i class="ti ti-lock"></i> ${finalCost} pts needed`;
        card.insertBefore(badge, card.firstChild);
      }
    }
  });
}

function redeem(btn, baseCost, name) {
  const finalCost = getDiscountedCost(baseCost);

  if (pts < finalCost) { showToast('Not enough points!'); return; }

  const redemptionId = 'RDM-' + Math.random().toString(36).substr(2, 6).toUpperCase();

  fetch("/api/rewards/redeem", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ baseCost, rewardName: name, redemptionId })
  })
    .then(res => res.json())
    .then(data => {
      if (!data.success) { showToast(data.message || 'Error redeeming'); return; }

      pts = data.newPoints;
      updatePts();
      updateRewardCards();

      btn.textContent = 'Redeemed!';
      btn.disabled = true;

      addHistoryItem(name, data.finalCost);
      showToast(name + ' redeemed! Show QR at the counter.');

      // Open QR page after short delay
      setTimeout(() => { window.location.href = '/qrpage'; }, 1500);
    })
    .catch(() => showToast('Error connecting to server'));
}

async function loadHistory() {
  try {
    const res = await fetch("/api/rewards/history", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!data.success) return;

    const list = document.getElementById('historyList');
    list.innerHTML = '';

    if (data.history.length === 0) {
      list.innerHTML = '<p style="font-size:13px;color:var(--warm-gray);padding:16px 0;">No redemptions yet.</p>';
      return;
    }

    data.history.forEach(h => {
      const date = new Date(h.created_at).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric'
      });
      const item = document.createElement('div');
      item.className = 'history-item';
      item.innerHTML = `
        <div class="history-icon redeem"><i class="ti ti-award"></i></div>
        <div class="history-info">
          <div class="history-name">Redeemed —${h.reward_name}</div>
          <div class="history-date">${date}</div>
        </div>
        <div class="history-pts redeem">-${h.points_deducted} pts</div>
      `;
      list.appendChild(item);
    });
  } catch (err) {
    console.error(err);
  }
}

function addHistoryItem(name, cost) {
  const list = document.getElementById('historyList');
  const today = new Date().toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
  const item = document.createElement('div');
  item.className = 'history-item';
  item.innerHTML = `
    <div class="history-icon redeem"><i class="ti ti-award"></i></div>
    <div class="history-info">
      <div class="history-name">Redeemed —${name}</div>
      <div class="history-date">${today}</div>
    </div>
    <div class="history-pts redeem">-${cost} pts</div>
  `;
  list.prepend(item);
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}
