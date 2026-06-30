const token = localStorage.getItem("token");
const expiry = localStorage.getItem("token_expiry");

if (!token || !expiry || Date.now() > parseInt(expiry)) {
  localStorage.removeItem("token");
  localStorage.removeItem("token_expiry");
  window.location.replace("/login");
}

async function loadOrders() {
  try {
    const res = await fetch("/orders", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!data.success) return;

    const list = document.getElementById("ordersList");
    const empty = document.getElementById("emptyState");

    if (!data.orders.length) {
      empty.style.display = "flex";
      return;
    }

    data.orders.forEach(order => {
      const items = typeof order.items === "string" ? JSON.parse(order.items) : order.items;
      const itemSummary = items.map(i => `${i.qty}x ${i.name}`).join(", ");
      const date = new Date(order.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

      const card = document.createElement("a");
      card.className = "order-card";
      card.href = `/order-status?id=${order.id}`;
      card.innerHTML = `
        <div class="card-top">
          <div class="order-number">#${order.order_number}</div>
          <div class="status-badge ${order.status}">${order.status === "ready" ? "Ready" : "Preparing"}</div>
        </div>
        <div class="order-meta">
          <span><i class="ti ti-calendar"></i> ${date}</span>
          <span><i class="ti ti-clock"></i> ${order.pickup_time || "\u2014"}</span>
        </div>
        <div class="order-items">${itemSummary}</div>
        <div class="card-bottom">
          <span>Total</span>
          <span>$${parseFloat(order.total).toFixed(2)}</span>
        </div>
      `;
      list.appendChild(card);
    });
  } catch (err) {
    console.error(err);
  }
}

loadOrders();
