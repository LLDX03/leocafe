const token = localStorage.getItem("token");
const expiry = localStorage.getItem("token_expiry");

if (!token || !expiry || Date.now() > parseInt(expiry)) {
  localStorage.removeItem("token");
  localStorage.removeItem("token_expiry");
  window.location.replace("/login");
}

// Set min date to today
const today = new Date().toISOString().split('T')[0];
document.getElementById('resDate').min = today;
document.getElementById('resDate').value = today;

let selectedGuests = 2;
let selectedSlot = null;

// â”€â”€ Grey out past slots when today is selected â”€â”€
function updateSlotAvailability() {
  const selectedDate = document.getElementById('resDate').value;
  const isToday = selectedDate === today;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  document.querySelectorAll('.slot-btn').forEach(btn => {
    // Skip slots already marked full by server
    if (btn.dataset.takenByServer === 'true') return;

    if (isToday) {
      // Parse slot time e.g. "9:00 AM"
      const timeStr = btn.textContent.trim();
      const [time, period] = timeStr.split(' ');
      let [hours, minutes] = time.split(':').map(Number);
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      const slotMinutes = hours * 60 + minutes;

      if (slotMinutes <= currentMinutes) {
        btn.classList.add('full');
        btn.disabled = true;
        // Deselect if this slot was selected
        if (selectedSlot === timeStr) {
          selectedSlot = null;
          btn.classList.remove('active');
        }
      } else {
        btn.classList.remove('full');
        btn.disabled = false;
      }
    } else {
      // Future date â€” all slots available (except server-taken ones)
      btn.classList.remove('full');
      btn.disabled = false;
    }
  });
}

// Run on page load and whenever date changes
updateSlotAvailability();
document.getElementById('resDate').addEventListener('change', () => {
  selectedSlot = null;
  document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('active'));
  loadTakenSlots(document.getElementById('resDate').value);
  updateSlotAvailability();
});

function selectGuests(btn, n) {
  document.querySelectorAll('.guest-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  selectedGuests = n;
}

function selectSlot(btn) {
  if (btn.classList.contains('full') || btn.disabled) return;
  document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  selectedSlot = btn.textContent.trim();
}

// Load taken slots from backend and mark them
async function loadTakenSlots(date) {
  if (!date) return;
  try {
    const res = await fetch(`/reservations/taken?date=${date}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!data.success) return;

    // Reset all server-taken flags first
    document.querySelectorAll('.slot-btn').forEach(btn => {
      btn.dataset.takenByServer = 'false';
    });

    // Mark taken slots
    data.takenSlots.forEach(time => {
      document.querySelectorAll('.slot-btn').forEach(btn => {
        if (btn.textContent.trim() === time) {
          btn.classList.add('full');
          btn.disabled = true;
          btn.dataset.takenByServer = 'true';
        }
      });
    });

    // Re-run time check after marking server slots
    updateSlotAvailability();

  } catch (err) {
    console.error('Error loading taken slots:', err);
  }
}

// Load existing reservations
async function loadReservations() {
  try {
    const res = await fetch('/reservations', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!data.success) return;

    const list = document.getElementById('resList');
    // Clear existing dynamic cards (keep any static ones if needed)
    list.querySelectorAll('.dynamic-res-card').forEach(el => el.remove());

    data.reservations.forEach(r => {
      const d = new Date(r.date);
      const formatted = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      const card = document.createElement('div');
      card.className = 'res-card dynamic-res-card';
      card.dataset.id = r.id;
      card.innerHTML = `
        <div class="res-icon"><i class="ti ti-calendar-event"></i></div>
        <div class="res-info">
          <div class="res-name">Table for ${r.guests}</div>
          <div class="res-detail">
            <span><i class="ti ti-calendar"></i> ${formatted}</span>
            <span><i class="ti ti-clock"></i> ${r.time}</span>
          </div>
        </div>
        <div class="res-status confirmed">Confirmed</div>
        <button class="btn-cancel" onclick="cancelRes(this, ${r.id})">Cancel</button>
      `;
      list.appendChild(card);
    });
  } catch (err) {
    console.error('Error loading reservations:', err);
  }
}

async function submitReservation() {
  const date = document.getElementById('resDate').value;
  if (!date) { showToast('Please choose a date.'); return; }
  if (!selectedSlot) { showToast('Please select a time slot.'); return; }

  const specialReq = document.getElementById('specialReq').value.trim();

  try {
    const res = await fetch('/reservations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        date,
        time: selectedSlot,
        guests: selectedGuests,
        specialRequests: specialReq || null
      })
    });

    const data = await res.json();

    if (data.success) {
      document.getElementById('successBanner').classList.add('show');
      document.getElementById('specialReq').value = '';
      document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('active'));

      showToast('â˜• Table reserved for ' + selectedGuests + ' on ' + date + ' at ' + selectedSlot);
      selectedSlot = null;

      loadReservations();
      loadTakenSlots(date);

      document.getElementById('successBanner').scrollIntoView({ behavior: 'smooth' });
    } else {
      showToast(data.message || 'Something went wrong');
    }
  } catch (err) {
    console.error(err);
    showToast('Cannot connect to server.');
  }
}

async function cancelRes(btn, id) {
  try {
    const res = await fetch(`/reservations/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success) {
      const card = btn.closest('.res-card');
      card.style.opacity = '0';
      card.style.transition = 'opacity 0.3s';
      setTimeout(() => card.remove(), 300);
      loadTakenSlots(document.getElementById('resDate').value);
      showToast('Reservation cancelled.');
    } else {
      showToast(data.message || 'Could not cancel reservation.');
    }
  } catch (err) {
    console.error(err);
    showToast('Cannot connect to server.');
  }
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// Initial load
loadReservations();
loadTakenSlots(today);
