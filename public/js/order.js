// Tab switching
function switchTab(btn, id) {
    document.querySelectorAll('.cat-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.menu-section').forEach(s => s.classList.remove('visible'));
    document.getElementById('sec-' + id).classList.add('visible');
}

// Milk selection per item
function selectMilk(btn) {
    const row = btn.closest('.milk-row');
    row.querySelectorAll('.milk-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

// Cart state
let cart = {};

function changeQty(btn, delta) {
    const ctrl = btn.parentElement;
    const numEl = ctrl.querySelector('.qty-num');
    const item = btn.closest('.order-item');
    const name = item.dataset.name;
    const price = parseFloat(item.dataset.price);
    let qty = parseInt(numEl.textContent) + delta;
    if (qty < 0) qty = 0;
    numEl.textContent = qty;

    if (qty === 0) {
        delete cart[name];
    } else {
        cart[name] = { name, price, qty };
    }
    renderCart();
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
        el.innerHTML = `<div><div class="cart-item-name">${it.qty}× ${it.name}</div><div class="cart-item-detail">$${it.price.toFixed(2)} each</div></div><div class="cart-item-right"><div class="cart-item-price">$${(it.price * it.qty).toFixed(2)}</div><button class="cart-item-remove" onclick="removeItem('${it.name}')"><i class="ti ti-x"></i></button></div>`;
        cartItemsEl.appendChild(el);
    });

    document.getElementById('cartSubtotal').textContent = '$' + subtotal.toFixed(2);
    document.getElementById('cartTotal').textContent = '$' + subtotal.toFixed(2);

    // Earn points estimate (10pts per dollar)
    const earnPts = Math.round(subtotal * 10);
    document.getElementById('ptsEarn').textContent = '+ ' + earnPts + ' pts earned on this order';

    // Pickup times
    const timeEl = document.getElementById('timeOptions');
    if (!timeEl.hasChildNodes()) {
        const now = new Date();
        [10, 20, 30, 45].forEach((mins, i) => {
            const t = new Date(now.getTime() + mins * 60000);
            const label = t.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + (mins === 10 ? ' · Soonest' : '');
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

function removeItem(name) {
    // reset qty in menu
    document.querySelectorAll('.order-item').forEach(el => {
        if (el.dataset.name === name) {
            el.querySelector('.qty-num').textContent = '0';
        }
    });
    delete cart[name];
    renderCart();
}

function placeOrder() {
    const items = Object.values(cart);
    if (items.length === 0) return;
    const ref = '#LC-' + Math.floor(1000 + Math.random() * 9000);
    const timeBtn = document.querySelector('.time-opt.active');
    const pickupTime = timeBtn ? timeBtn.textContent.split(' ·')[0] : 'soon';
    document.getElementById('orderRef').textContent = ref;
    document.getElementById('orderMsg').textContent = 'Ready for pickup at ' + pickupTime + '. Show this reference at the counter.';

    // Award points
    const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
    const earnPts = Math.round(subtotal * 10);
    let pts = parseInt(localStorage.getItem('leos_points') || '240');
    pts += earnPts;
    localStorage.setItem('leos_points', pts);

    document.getElementById('successOverlay').classList.add('show');
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