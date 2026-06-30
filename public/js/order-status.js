const token = localStorage.getItem("token");
const expiry = localStorage.getItem("token_expiry");

if (!token || !expiry || Date.now() > parseInt(expiry)) {
  localStorage.removeItem("token");
  localStorage.removeItem("token_expiry");
  window.location.replace("/login");
}

const params = new URLSearchParams(window.location.search);
const orderId = params.get("id");

if (!orderId) window.location.replace("/order");

let pollInterval;

async function fetchOrder() {
  try {
    const res = await fetch(`/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!data.success) return;

    const order = data.order;
    document.getElementById("orderNum").textContent = "#" + order.order_number;
    document.getElementById("pickupLabel").textContent = "Estimated pickup: " + order.pickup_time;

    // Items
    const list = document.getElementById("itemsList");
    list.innerHTML = "";
    const items = typeof order.items === "string" ? JSON.parse(order.items) : order.items;
    items.forEach(it => {
      const row = document.createElement("div");
      row.className = "order-line";
      row.innerHTML = `<span><span class="qty">${it.qty}x</span> ${it.name}</span><span>$${(it.price * it.qty).toFixed(2)}</span>`;
      list.appendChild(row);
    });

    document.getElementById("orderTotal").textContent = "$" + parseFloat(order.total).toFixed(2);

    setStatus(order.status);
  } catch (err) {
    console.error(err);
  }
}

function setStatus(status) {
  const card = document.getElementById("statusCard");
  const title = document.getElementById("statusTitle");
  const sub = document.getElementById("statusSub");
  const icon = document.getElementById("statusIcon");
  const iconWrap = document.getElementById("statusIconWrap");
  const btnNew = document.getElementById("btnNewOrder");

  if (status === "ready") {
    card.classList.add("ready");
    iconWrap.classList.add("ready");
    icon.className = "ti ti-checks status-icon";
    title.textContent = "Your order is ready for collection";
    sub.textContent = "Please collect your order at the counter.";
    btnNew.style.display = "inline-block";
    clearInterval(pollInterval);
  } else {
    card.classList.remove("ready");
    iconWrap.classList.remove("ready");
    icon.className = "ti ti-coffee status-icon";
    title.textContent = "We're preparing your order";
    sub.textContent = "Sit tight \u2014 this usually takes just a few minutes.";
  }
}

fetchOrder();
pollInterval = setInterval(fetchOrder, 10000);
