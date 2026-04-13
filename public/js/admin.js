let adminToken = localStorage.getItem("adminToken") || "";

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${adminToken}`
  };
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

async function adminLogin() {
  const phone = document.getElementById("adminPhone").value.trim();
  const password = document.getElementById("adminPassword").value.trim();
  setText("adminLoginMsg", "Kirilmoqda...");

  try {
    const res = await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, password })
    });
    const data = await res.json();
    if (!res.ok || !data.token) throw new Error(data.message || "Login xato.");

    adminToken = data.token;
    localStorage.setItem("adminToken", adminToken);

    const profileRes = await fetch("/profile", { headers: { Authorization: `Bearer ${adminToken}` } });
    const profile = await profileRes.json();
    if (!profileRes.ok || profile.role !== "admin") throw new Error("Bu akkaunt admin emas.");

    document.getElementById("adminLoginCard").style.display = "none";
    document.getElementById("adminApp").style.display = "block";
    await loadAllAdminData();
  } catch (err) {
    setText("adminLoginMsg", err.message || "Login xatolik.");
  }
}

async function addMenuItem() {
  const payload = {
    name: document.getElementById("mName").value.trim(),
    price: Number(document.getElementById("mPrice").value),
    category: document.getElementById("mCategory").value,
    image: document.getElementById("mImage").value.trim(),
    description: document.getElementById("mDesc").value.trim()
  };

  if (!payload.name || !payload.price || !payload.category) {
    setText("menuMsg", "name, price, category majburiy.");
    return;
  }

  const res = await fetch("/menu", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) {
    setText("menuMsg", data.message || "Menu qo'shilmadi.");
    return;
  }

  setText("menuMsg", "Menu muvaffaqiyatli qo'shildi.");
  await loadMenuList();
}

async function deleteMenuItem(id) {
  const res = await fetch(`/menu/${id}`, {
    method: "DELETE",
    headers: authHeaders()
  });
  const data = await res.json();
  if (!res.ok) {
    alert(data.message || "O'chirib bo'lmadi.");
    return;
  }
  await loadMenuList();
}

async function updateMenuPrice(id) {
  const input = document.getElementById(`price-${id}`);
  const newPrice = Number(input?.value || 0);
  if (!newPrice) {
    alert("Narxni kiriting.");
    return;
  }

  const res = await fetch(`/menu/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ price: newPrice })
  });
  const data = await res.json();
  if (!res.ok) {
    alert(data.message || "Narx yangilanmadi.");
    return;
  }
  await loadMenuList();
}

async function updateOrderStatus(orderId, status) {
  const res = await fetch(`/order/status/${orderId}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ status })
  });
  const data = await res.json();
  if (!res.ok) {
    alert(data.message || "Status yangilanmadi.");
    return;
  }
  await loadOrders();
}

async function loadMenuList() {
  const res = await fetch("/menu");
  const items = await res.json();
  const wrap = document.getElementById("menuListWrap");
  if (!items.length) {
    wrap.innerHTML = "<p class='muted'>Menu bo'sh.</p>";
    return;
  }

  wrap.innerHTML = items
    .map(
      (i) => `
      <div class="cart-row">
        <div><strong>${i.name}</strong><br /><span class="muted">${i.category}</span></div>
        <div>
          <input id="price-${i.id}" type="number" value="${Number(i.price)}" style="max-width:110px;" />
          <button class="btn btn-success" onclick="updateMenuPrice(${i.id})">Narxni saqlash</button>
        </div>
        <div><button class="btn btn-dark" onclick="deleteMenuItem(${i.id})">Delete</button></div>
      </div>
    `
    )
    .join("");
}

async function loadOrders() {
  const res = await fetch("/orders", { headers: authHeaders() });
  const orders = await res.json();
  const wrap = document.getElementById("ordersWrap");
  if (!res.ok) {
    wrap.textContent = orders.message || "Orders yuklanmadi.";
    return;
  }
  if (!orders.length) {
    wrap.innerHTML = "<p class='muted'>Order yo'q.</p>";
    return;
  }

  const statuses = ["Yangi", "Tayyorlanmoqda", "Yetkazildi"];
  wrap.innerHTML = orders
    .map((o) => {
      const opts = statuses
        .map((s) => `<option value="${s}" ${o.status === s ? "selected" : ""}>${s}</option>`)
        .join("");

      return `
      <div class="card" style="margin-bottom:10px;">
        <p><strong>Order #${o.id}</strong> | ${money(o.total_price)} so'm</p>
        <p class="muted">Payment: ${o.payment_provider || "-"} (${o.payment_status || "-"})</p>
        <p class="muted">Mijoz: ${o.customer_name || "-"} / ${o.customer_phone || "-"}</p>
        <div class="field">
          <label>Status</label>
          <select onchange="updateOrderStatus(${o.id}, this.value)">${opts}</select>
        </div>
      </div>
    `;
    })
    .join("");
}

async function loadTopItems() {
  const res = await fetch("/admin/top-items", { headers: authHeaders() });
  const data = await res.json();
  const wrap = document.getElementById("topItemsWrap");
  if (!res.ok) {
    wrap.textContent = data.message || "Top items yuklanmadi.";
    return;
  }
  if (!data.length) {
    wrap.innerHTML = "<p class='muted'>Hozircha sotuv ma'lumoti yo'q.</p>";
    return;
  }
  wrap.innerHTML = data.map((x) => `<p>${x.name}: <strong>${x.qty} ta</strong></p>`).join("");
}

async function loadStats() {
  const res = await fetch("/admin/stats", { headers: authHeaders() });
  const data = await res.json();
  const wrap = document.getElementById("statsWrap");
  if (!res.ok) {
    wrap.textContent = data.message || "Statistika yuklanmadi.";
    return;
  }
  wrap.innerHTML = `
    <p>Kunlik daromad: <strong>${money(data.daily_revenue)} so'm</strong></p>
    <p>Jami buyurtmalar: <strong>${data.total_orders}</strong></p>
  `;
}

async function loadFeedback() {
  const res = await fetch("/admin/feedback", { headers: authHeaders() });
  const data = await res.json();
  const wrap = document.getElementById("feedbackWrap");
  if (!res.ok) {
    wrap.textContent = data.message || "Feedback yuklanmadi.";
    return;
  }
  if (!data.length) {
    wrap.innerHTML = "<p class='muted'>Feedback yo'q.</p>";
    return;
  }
  wrap.innerHTML = data
    .map(
      (f) => `
      <div class="card" style="margin-bottom:10px;">
        <p><strong>User:</strong> ${f.user_id || "guest"}</p>
        <p><strong>Message:</strong> ${f.message}</p>
        <p><strong>Response:</strong> ${f.response}</p>
      </div>
    `
    )
    .join("");
}

async function loadAllAdminData() {
  await Promise.all([loadMenuList(), loadOrders(), loadTopItems(), loadFeedback(), loadStats()]);
}

window.deleteMenuItem = deleteMenuItem;
window.updateOrderStatus = updateOrderStatus;
window.updateMenuPrice = updateMenuPrice;

document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("adminLoginBtn")?.addEventListener("click", adminLogin);
  document.getElementById("addMenuBtn")?.addEventListener("click", addMenuItem);

  if (!adminToken) return;
  try {
    const res = await fetch("/profile", { headers: { Authorization: `Bearer ${adminToken}` } });
    const profile = await res.json();
    if (!res.ok || profile.role !== "admin") return;
    document.getElementById("adminLoginCard").style.display = "none";
    document.getElementById("adminApp").style.display = "block";
    await loadAllAdminData();
  } catch (_e) {}
});
