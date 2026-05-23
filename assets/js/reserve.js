// Set min date to today
const today = new Date().toISOString().split('T')[0];
document.getElementById('resDate').min = today;
document.getElementById('resDate').value = today;

let selectedGuests = 2;
let selectedSlot = null;

function selectGuests(btn, n) {
    document.querySelectorAll('.guest-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedGuests = n;
}

function selectSlot(btn) {
    document.querySelectorAll('.slot-btn:not(.full)').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedSlot = btn.textContent;
}

function submitReservation() {
    const date = document.getElementById('resDate').value;
    if (!date) { showToast('Please choose a date.'); return; }
    if (!selectedSlot) { showToast('Please select a time slot.'); return; }

    // Show success
    document.getElementById('successBanner').classList.add('show');

    // Add to list
    const list = document.getElementById('resList');
    const d = new Date(date);
    const formatted = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const card = document.createElement('div');
    card.className = 'res-card';
    card.innerHTML = `<div class="res-icon"><i class="ti ti-calendar-event"></i></div><div class="res-info"><div class="res-name">Table for ${selectedGuests}</div><div class="res-detail"><span><i class="ti ti-calendar"></i> ${formatted}</span><span><i class="ti ti-clock"></i> ${selectedSlot}</span></div></div><div class="res-status confirmed">Confirmed</div><button class="btn-cancel" onclick="cancelRes(this)">Cancel</button>`;
    list.prepend(card);

    showToast('☕ Table reserved for ' + selectedGuests + ' on ' + formatted + ' at ' + selectedSlot);
    selectedSlot = null;
    document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('specialReq').value = '';
    document.getElementById('successBanner').scrollIntoView({ behavior: 'smooth' });
}

function cancelRes(btn) {
    const card = btn.closest('.res-card');
    card.style.opacity = '0';
    card.style.transition = 'opacity 0.3s';
    setTimeout(() => card.remove(), 300);
    showToast('Reservation cancelled.');
}

function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}