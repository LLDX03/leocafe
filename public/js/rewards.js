// Get token from localStorage
const token = localStorage.getItem("token");
const expiry = localStorage.getItem("token_expiry");

// Check if logged in
if (!token || !expiry || Date.now() > expiry) {
  localStorage.removeItem("token");
  localStorage.removeItem("token_expiry");
  window.location.replace("/views/login.html");
}

// Global points variable
let pts = 0;

// Fetch user data from backend
fetch("http://localhost:3000/auth/me", {
  headers: {
    Authorization: `Bearer ${token}`
  }
})
  .then(res => res.json())
  .then(data => {
    if (!data.success) {
      window.location.href = "/views/login.html";
      return;
    }

    const user = data.user;

    // Update UI with user data
    document.getElementById("cardName").textContent = user.username;

    // Member since year (from createdAt or use current year)
    const memberYear = user.createdAt ? new Date(user.createdAt).getFullYear() : new Date().getFullYear();
    const memberGreeting = document.querySelector('.card-greeting');
    if (memberGreeting) {
      memberGreeting.textContent = `Member since ${memberYear}`;
    }

    // Birthday with null check
    if (user.birthday) {
      document.getElementById("birthday").textContent =
        new Date(user.birthday).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short"
        });
    } else {
      document.getElementById("birthday").textContent = "Not set";
    }

    // Tier (from backend, default to 'Bronze')
    document.getElementById("tier").textContent = user.tier || "Bronze";

    // Set global points and update display
    pts = user.points;
    updatePts();

    // Update reward card states based on points
    updateRewardCardStates();

    console.log("User data:", user);
  })
  .catch(err => {
    console.error("Error loading user:", err);
    alert("Failed to load user data");
  });

function updatePts() {
  document.getElementById('cardPts').textContent = pts;

  const pct = Math.min(Math.round((pts / 300) * 100), 100);
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('progressPct').textContent = pct + '%';
}

// Function to enable/disable reward cards based on user's points
function updateRewardCardStates() {
  // Get all reward buttons with their cost
  const redeemButtons = document.querySelectorAll('.btn-redeem');
  
  redeemButtons.forEach(btn => {
    // Find the cost from parent card
    const card = btn.closest('.reward-card');
    const costText = card.querySelector('.reward-cost');
    
    // Extract the number from cost text (e.g., "100 pts" → 100)
    const costMatch = costText.textContent.match(/\d+/);
    const cost = costMatch ? parseInt(costMatch[0]) : 0;
    
    // Enable/disable button based on whether user has enough points
    if (pts >= cost) {
      btn.disabled = false;
      card.classList.remove('locked');
      
      // Remove lock badge if it exists
      const lockBadge = card.querySelector('.lock-badge');
      if (lockBadge) {
        lockBadge.remove();
      }
    } else {
      btn.disabled = true;
      card.classList.add('locked');
      
      // Add lock badge if it doesn't exist
      if (!card.querySelector('.lock-badge')) {
        const lockBadge = document.createElement('div');
        lockBadge.className = 'lock-badge';
        lockBadge.innerHTML = `<i class="ti ti-lock"></i> ${cost} pts needed`;
        card.insertBefore(lockBadge, card.firstChild);
      }
    }
  });
}

function redeem(btn, cost, name) {
  if (pts < cost) {
    showToast('Not enough points!');
    return;
  }

  // Deduct points on frontend
  pts -= cost;
  updatePts();
  updateRewardCardStates();
  
  btn.textContent = 'Redeemed!';
  btn.disabled = true;

  // Generate unique redemption ID
  const redemptionId = 'RDM-' + Math.random().toString(36).substr(2, 6).toUpperCase();

  // Send deduction to backend
  deductPointsFromBackend(cost, name, redemptionId);

  // Show redemption modal
  showRedemptionModal(name, cost, redemptionId);

  // Add to history
  const list = document.getElementById('historyList');
  const item = document.createElement('div');
  item.className = 'history-item';
  const today = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  item.innerHTML = `
    <div class="history-icon redeem"><i class="ti ti-award"></i></div>
    <div class="history-info">
      <div class="history-name">Redeemed — ${name}</div>
      <div class="history-date">${today}</div>
    </div>
    <div class="history-pts redeem">−${cost} pts</div>
  `;

  list.prepend(item);
  showToast('☕ ' + name + ' redeemed!');
}

function deductPointsFromBackend(cost, rewardName, redemptionId) {
  const token = localStorage.getItem("token");
  
  fetch("http://localhost:3000/rewards", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      pointsDeducted: cost,
      rewardName: rewardName,
      redemptionId: redemptionId
    })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        console.log("Points deducted from database");
      } else {
        console.error("Failed to deduct points:", data.message);
        showToast("Error saving redemption");
      }
    })
    .catch(err => {
      console.error("Error deducting points:", err);
      showToast("Error saving redemption");
    });
}

function showRedemptionModal(rewardName, cost, redemptionId) {
  // Create modal HTML
  const modal = document.createElement('div');
  modal.className = 'redemption-modal-backdrop';
  modal.innerHTML = `
    <div class="redemption-modal-card">
      <div class="modal-header">
        <div class="success-icon">✓</div>
        <div class="modal-title">Redeemed!</div>
        <div class="modal-subtitle">Show this QR at the counter</div>
      </div>

      <div class="reward-details">
        <div class="reward-name">${rewardName}</div>
        <div class="reward-cost">${cost} pts used</div>
      </div>

      <div class="qr-container" id="qrContainer"></div>

      <div class="ref-number">
        <div class="ref-label">Redemption ID</div>
        <div class="ref-value">${redemptionId}</div>
      </div>

      <div class="validity-text">Valid for 24 hours</div>

      <button class="btn-close" onclick="closeRedemptionModal()">Close</button>
    </div>
  `;

  document.body.appendChild(modal);

  // Generate QR code
  generateQRCode(redemptionId, 'qrContainer');
}

function closeRedemptionModal() {
  const modal = document.querySelector('.redemption-modal-backdrop');
  if (modal) {
    modal.remove();
  }
}

function generateQRCode(text, containerId) {
  // Load QR code library
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
  
  script.onload = () => {
    const container = document.getElementById(containerId);
    if (container) {
      // Clear any existing content
      container.innerHTML = '';
      
      // Create a new QR code and append to container
      new QRCode(container, {
        text: text,
        width: 200,
        height: 200,
        colorDark: '#1E1E1B',
        colorLight: '#FFFFFF',
        correctLevel: QRCode.CorrectLevel.H
      });
    }
  };
  
  document.head.appendChild(script);
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}