const token = localStorage.getItem("token");
const expiry = localStorage.getItem("token_expiry");

if (!token || !expiry || Date.now() > expiry) {
    localStorage.removeItem("token");
    localStorage.removeItem("token_expiry");
    window.location.replace("/views/login.html");
}

const BASE_URL = "http://localhost:3000";

// Set min date to today
const today = new Date().toISOString().split('T')[0];
document.getElementById('resDate').min = today;
document.getElementById('resDate').value = today;

let selectedGuests = 2;
let selectedSlot = null;

// Load taken slots and reservations on page load
loadTakenSlots(today);
loadReservations();

// Reload taken slots when date changes
document.getElementById('resDate').addEventListener('change', (e) => {
    loadTakenSlots(e.target.value);
});

async function loadTakenSlots(date) {
    try {
        const res = await fetch(`${BASE_URL}/reservations/slots?date=${date}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();

        if (!data.success) return;

        // Reset all slots first
        document.querySelectorAll('.slot-btn').forEach(btn => {
            btn.classList.remove('full');
            btn.disabled = false;
            btn.onclick = () => selectSlot(btn);
        });

        // Cross out taken slots
        data.takenSlots.forEach(takenTime => {
            document.querySelectorAll('.slot-btn').forEach(btn => {
                if (btn.textContent.trim() === takenTime) {
                    btn.classList.add('full');
                    btn.disabled = true;
                    btn.onclick = null;
                }
            });
        });

    } catch (err) {
        console.log(err);
    }
}

async function loadReservations() {
    try {
        const res = await fetch(`${BASE_URL}/reservations`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();

        if (!data.success) return;

        const list = document.getElementById('resList');
        list.innerHTML = ''; // clear hardcoded placeholder

        if (data.reservations.length === 0) {
            list.innerHTML = '<p style="color:var(--warm-gray);text-align:center;padding:24px;">No upcoming reservations.</p>';
            return;
        }

        data.reservations.forEach(r => {
            const d = new Date(r.date);
            const formatted = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
            const card = document.createElement('div');
            card.className = 'res-card';
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
        console.log(err);
    }
}

function selectGuests(btn, n) {
    document.querySelectorAll('.guest-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedGuests = n;
}

function selectSlot(btn) {
    document.querySelectorAll('.slot-btn:not(.full)').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedSlot = btn.textContent.trim();
}

async function submitReservation() {
    const date = document.getElementById('resDate').value;
    if (!date) { showToast('Please choose a date.'); return; }
    if (!selectedSlot) { showToast('Please select a time slot.'); return; }

    const specialRequests = document.getElementById('specialReq').value;

    try {
        const res = await fetch(`${BASE_URL}/reservations`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                date,
                time: selectedSlot,
                guests: selectedGuests,
                specialRequests
            })
        });

        const data = await res.json();

        if (data.success) {
            document.getElementById('successBanner').classList.add('show');
            document.getElementById('specialReq').value = '';
            selectedSlot = null;
            document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('active'));

            // Reload both reservations and taken slots
            loadReservations();
            loadTakenSlots(date);

            document.getElementById('successBanner').scrollIntoView({ behavior: 'smooth' });
            showToast('☕ Table reserved for ' + selectedGuests + ' on ' + date + ' at ' + selectedSlot);
        } else {
            showToast(data.message || 'Something went wrong');
        }

    } catch (err) {
        console.log(err);
        showToast('Server error');
    }
}

async function cancelRes(btn, id) {
    try {
        const res = await fetch(`${BASE_URL}/reservations/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` }
        });

        const data = await res.json();

        if (data.success) {
            const card = btn.closest('.res-card');
            card.style.opacity = '0';
            card.style.transition = 'opacity 0.3s';
            setTimeout(() => card.remove(), 300);
            showToast('Reservation cancelled.');

            // Reload taken slots in case it frees up a slot
            loadTakenSlots(document.getElementById('resDate').value);
        } else {
            showToast(data.message || 'Could not cancel');
        }

    } catch (err) {
        console.log(err);
        showToast('Server error');
    }
}

function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}