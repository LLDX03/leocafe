const token = localStorage.getItem("token");
const expiry = localStorage.getItem("token_expiry");

if (!token || !expiry || Date.now() > parseInt(expiry)) {
  localStorage.removeItem("token");
  localStorage.removeItem("token_expiry");
  window.location.replace("/login");
}

async function loadQRCodes() {
  try {
    const res = await fetch("/api/rewards/active-qr", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();

    const list = document.getElementById('qrList');
    const empty = document.getElementById('emptyState');

    if (!data.success || data.codes.length === 0) {
      empty.style.display = 'block';
      return;
    }

    loadQRLib(() => {
      data.codes.forEach(code => renderQRCard(code));
    });

  } catch (err) {
    console.error(err);
    document.getElementById('emptyState').style.display = 'block';
  }
}

function loadQRLib(callback) {
  if (window.QRCode) { callback(); return; }
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
  script.onload = callback;
  document.head.appendChild(script);
}

function renderQRCard(code) {
  const list = document.getElementById('qrList');

  const expires = new Date(code.expires_at);
  const now = new Date();
  const diffMs = expires - now;
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffMins = Math.floor((diffMs % 3600000) / 60000);
  const timeLeft = diffHrs > 0 ? `${diffHrs}h ${diffMins}m remaining` : `${diffMins}m remaining`;

  const card = document.createElement('div');
  card.className = 'qr-card';
  card.innerHTML = `
    <div class="qr-card-header">
      <div>
        <div class="qr-reward-name">${code.reward_name}</div>
        <div class="qr-meta">${code.points_deducted} pts Â· Expires in ${timeLeft}</div>
      </div>
      <div class="qr-ref">${code.redemption_id}</div>
    </div>
    <div class="qr-code-wrap" id="qr-${code.redemption_id}"></div>
    <div class="qr-footer">
      <i class="ti ti-info-circle"></i> Show this QR at the counter to redeem
    </div>
  `;
  list.appendChild(card);

  new QRCode(document.getElementById(`qr-${code.redemption_id}`), {
    text: code.redemption_id,
    width: 180,
    height: 180,
    colorDark: '#1E1C1A',
    colorLight: '#FFFFFF',
    correctLevel: QRCode.CorrectLevel.H
  });
}

loadQRCodes();
