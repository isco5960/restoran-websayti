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

async function requestJSON(url, options = {}) {
  const res = await fetch(url, options);
  const raw = await res.text();
  let data;
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch (_e) {
    throw new Error(`Server JSON qaytarmadi: ${raw.slice(0, 120)}`);
  }
  if (!res.ok) throw new Error(data.message || "Server xatoligi.");
  return data;
}

async function adminLogin() {
  const phone = document.getElementById("adminPhone").value.trim();
  const password = document.getElementById("adminPassword").value.trim();
  setText("adminLoginMsg", "Kirilmoqda...");

  try {
    const data = await requestJSON("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, password })
    });
    if (!data.token) throw new Error("Login xato.");

    adminToken = data.token;
    localStorage.setItem("adminToken", adminToken);

    const profile = await requestJSON("/profile", { headers: { Authorization: `Bearer ${adminToken}` } });
    if (profile.role !== "admin") throw new Error("Bu akkaunt admin emas.");

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

  try {
    await requestJSON("/menu", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });
    setText("menuMsg", "Menu muvaffaqiyatli qo'shildi.");
    await loadMenuList();
  } catch (err) {
    setText("menuMsg", err.message || "Menu qo'shilmadi.");
  }
}

async function deleteMenuItem(id) {
  try {
    await requestJSON(`/menu/${id}`, {
      method: "DELETE",
      headers: authHeaders()
    });
    await loadMenuList();
  } catch (err) {
    alert(err.message || "O'chirib bo'lmadi.");
  }
}

async function updateMenuPrice(id) {
  const input = document.getElementById(`price-${id}`);
  const newPrice = Number(input?.value || 0);
  if (!newPrice) {
    alert("Narxni kiriting.");
    return;
  }

  try {
    await requestJSON(`/menu/${id}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ price: newPrice })
    });
    await loadMenuList();
  } catch (err) {
    alert(err.message || "Narx yangilanmadi.");
  }
}

async function updateOrderStatus(orderId, status) {
  try {
    await requestJSON(`/order/status/${orderId}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ status })
    });
    await loadOrders();
  } catch (err) {
    alert(err.message || "Status yangilanmadi.");
  }
}

async function loadMenuList() {
  const items = await requestJSON("/menu");
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
  const wrap = document.getElementById("ordersWrap");
  let orders = [];
  try {
    orders = await requestJSON("/orders", { headers: authHeaders() });
  } catch (err) {
    wrap.textContent = err.message || "Orders yuklanmadi.";
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
  const wrap = document.getElementById("topItemsWrap");
  let data = [];
  try {
    data = await requestJSON("/admin/top-items", { headers: authHeaders() });
  } catch (err) {
    wrap.textContent = err.message || "Top items yuklanmadi.";
    return;
  }
  if (!data.length) {
    wrap.innerHTML = "<p class='muted'>Hozircha sotuv ma'lumoti yo'q.</p>";
    return;
  }
  wrap.innerHTML = data.map((x) => `<p>${x.name}: <strong>${x.qty} ta</strong></p>`).join("");
}

async function loadStats() {
  const wrap = document.getElementById("statsWrap");
  let data;
  try {
    data = await requestJSON("/admin/stats", { headers: authHeaders() });
  } catch (err) {
    wrap.textContent = err.message || "Statistika yuklanmadi.";
    return;
  }
  wrap.innerHTML = `
    <p>Kunlik daromad: <strong>${money(data.daily_revenue)} so'm</strong></p>
    <p>Jami buyurtmalar: <strong>${data.total_orders}</strong></p>
  `;
}

async function loadFeedback() {
  const wrap = document.getElementById("feedbackWrap");
  let data = [];
  try {
    data = await requestJSON("/admin/feedback", { headers: authHeaders() });
  } catch (err) {
    wrap.textContent = err.message || "Feedback yuklanmadi.";
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
    const profile = await requestJSON("/profile", { headers: { Authorization: `Bearer ${adminToken}` } });
    if (profile.role !== "admin") return;
    document.getElementById("adminLoginCard").style.display = "none";
    document.getElementById("adminApp").style.display = "block";
    await loadAllAdminData();
  } catch (_e) {}
});
