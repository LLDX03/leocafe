// Tab switching
function switchTab(btn, id) {
    document.querySelectorAll('.cat-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.menu-section').forEach(s => s.classList.remove('visible'));
    document.getElementById('sec-' + id).classList.add('visible');
}

// Milk selection per item - switch counter to show that variant's qty
function selectMilk(btn) {
    const row = btn.closest('.milk-row');
    const item = btn.closest('.order-item');
    if (row.querySelector('.milk-btn.active') === btn) return;

    row.querySelectorAll('.milk-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Show the qty already in cart for this variant
    const milkLabel = btn.textContent.trim();
    const cartKey = item.dataset.name + '|' + milkLabel;
    const numEl = item.querySelector('.qty-num');
    if (numEl) numEl.textContent = cart[cartKey] ? cart[cartKey].qty : '0';
}

// Cart state
let cart = {};

function changeQty(btn, delta) {
    const ctrl = btn.parentElement;
    const numEl = ctrl.querySelector('.qty-num');
    const item = btn.closest('.order-item');
    const name = item.dataset.name;
    const basePrice = parseFloat(item.dataset.price);
    const activeMilk = item.querySelector('.milk-btn.active');
    const milkLabel = activeMilk ? activeMilk.textContent.trim() : 'Whole';
    const milkMatch = activeMilk ? activeMilk.textContent.match(/\+\$(\d+(\.\d+)?)/) : null;
    const milkExtra = milkMatch ? parseFloat(milkMatch[1]) : 0;
    const price = basePrice + milkExtra;
    const cartKey = name + '|' + milkLabel;
    const displayName = milkExtra > 0 ? `${name} (${milkLabel.split(' ')[0]})` : name;

    let qty = parseInt(numEl.textContent) + delta;
    if (qty < 0) qty = 0;
    numEl.textContent = qty;

    if (qty === 0) {
        delete cart[cartKey];
    } else {
        cart[cartKey] = { cartKey, name: displayName, price, qty };
    }
    renderCart();
}

function updateCartHandle(items, total) {
    const countEl = document.getElementById('cartHandleCount');
    const totalEl = document.getElementById('cartHandleTotal');
    if (!countEl) return;
    const totalQty = items.reduce((s, it) => s + it.qty, 0);
    countEl.textContent = totalQty > 0 ? `${totalQty} item${totalQty > 1 ? 's' : ''}` : 'Your Order';
    totalEl.textContent = totalQty > 0 ? '$' + total.toFixed(2) : '';
}

function renderCart() {
    const items = Object.values(cart);
    const empty = document.getElementById('cartEmpty');
    const summary = document.getElementById('cartSummary');
    const btn = document.getElementById('btnPlace');
    const cartItemsEl = document.getElementById('cartItems');

    // Clear existing cart item rows (not the empty notice)
    cartItemsEl.querySelectorAll('.cart-item').forEach(el => el.remove());

    if (items.length === 0) {
        empty.style.display = 'block';
        summary.style.display = 'none';
        btn.disabled = true;
        updateCartHandle(items, 0);
        return;
    }
    empty.style.display = 'none';
    summary.style.display = 'block';
    btn.disabled = false;

    let subtotal = 0;
    items.forEach(it => {
        subtotal += it.price * it.qty;
        const el = document.createElement('div');
        el.className = 'cart-item';
        el.innerHTML = `<div><div class="cart-item-name">${it.qty}x ${it.name}</div><div class="cart-item-detail">$${it.price.toFixed(2)} each</div></div><div class="cart-item-right"><div class="cart-item-price">$${(it.price * it.qty).toFixed(2)}</div><button class="cart-item-remove" onclick="removeItem('${it.cartKey}')"><i class="ti ti-x"></i></button></div>`;
        cartItemsEl.appendChild(el);
    });

    document.getElementById('cartSubtotal').textContent = '$' + subtotal.toFixed(2);
    document.getElementById('cartTotal').textContent = '$' + subtotal.toFixed(2);
    updateCartHandle(items, subtotal);

    // Earn points estimate (10pts per dollar)
    const earnPts = Math.round(subtotal * 10);
    document.getElementById('ptsEarn').textContent = '+ ' + earnPts + ' pts earned on this order';

    // Pickup times
    const timeEl = document.getElementById('timeOptions');
    if (!timeEl.hasChildNodes()) {
        const now = new Date();
        [10, 20, 30, 45].forEach((mins, i) => {
            const t = new Date(now.getTime() + mins * 60000);
            const label = t.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + (mins === 10 ? ' \u00B7 Soonest' : '');
            const btn2 = document.createElement('button');
            btn2.className = 'time-opt' + (i === 0 ? ' active' : '');
            btn2.textContent = label;
            btn2.onclick = () => {
                document.querySelectorAll('.time-opt').forEach(b => b.classList.remove('active'));
                btn2.classList.add('active');
            };
            timeEl.appendChild(btn2);
        });
    }
}

function removeItem(cartKey) {
    const [itemName, milkLabel] = cartKey.split('|');
    document.querySelectorAll('.order-item').forEach(el => {
        if (el.dataset.name === itemName) {
            const activeBtn = el.querySelector('.milk-btn.active');
            if (activeBtn && activeBtn.textContent.trim() === milkLabel) {
                el.querySelector('.qty-num').textContent = '0';
            }
        }
    });
    delete cart[cartKey];
    renderCart();
}

async function placeOrder() {
    const items = Object.values(cart);
    if (items.length === 0) return;

    const token = localStorage.getItem("token");
    const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
    const earnPts = Math.round(subtotal * 10);
    const timeBtn = document.querySelector('.time-opt.active');
    const pickupTime = timeBtn ? timeBtn.textContent.split('\u00B7')[0].trim() : 'soon';

    const btn = document.getElementById('btnPlace');
    btn.disabled = true;
    btn.textContent = 'Placing order...';

    try {
        // Save points
        await fetch("/api/rewards/earn", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ pointsEarned: earnPts })
        });

        // Save order
        const res = await fetch("/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ items, total: subtotal, pickupTime })
        });

        const data = await res.json();
        if (!data.success) { showToast("Error placing order"); btn.disabled = false; btn.textContent = 'Place Order'; return; }

        window.location.href = "/order-status?id=" + data.orderId;

    } catch (err) {
        showToast("Server error");
        btn.disabled = false;
        btn.textContent = 'Place Order';
    }
}

function resetOrder() {
    cart = {};
    document.querySelectorAll('.qty-num').forEach(el => el.textContent = '0');
    document.getElementById('timeOptions').innerHTML = '';
    renderCart();
}

function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

// Mobile cart toggle
function openCart() {
    document.getElementById('cartCol').classList.add('open');
    document.getElementById('cartBackdrop').classList.add('show');
}

function closeCart() {
    document.getElementById('cartCol').classList.remove('open');
    document.getElementById('cartBackdrop').classList.remove('show');
}

document.getElementById('cartHandle').addEventListener('click', (e) => {
    if (e.target.closest('#cartCloseBtn')) return;
    const isOpen = document.getElementById('cartCol').classList.contains('open');
    isOpen ? closeCart() : openCart();
});

document.getElementById('cartCloseBtn').addEventListener('click', closeCart);
document.getElementById('cartBackdrop').addEventListener('click', closeCart);
