const API_BASE = "";

function getCart() {
  return JSON.parse(localStorage.getItem("cart") || "[]");
}
function setCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
}
function addToCart(item) {
  const cart = getCart();
  const found = cart.find((i) => i.id === item.id);
  if (found) found.qty += 1;
  else cart.push({ ...item, qty: 1 });
  setCart(cart);
  updateCartCount();
}
function updateCartCount() {
  const count = getCart().reduce((s, i) => s + i.qty, 0);
  document.querySelectorAll(".cart-count").forEach((el) => (el.textContent = count));
}
function money(n) {
  return Number(n).toLocaleString("en-US");
}

async function loadTopMenu(limit = 6) {
  const res = await fetch(`${API_BASE}/menu`);
  const all = await res.json();
  return all.slice(0, limit);
}

function mountChatbot() {
  const toggle = document.getElementById("chatToggle");
  const box = document.getElementById("chatBox");
  const close = document.getElementById("chatClose");
  const send = document.getElementById("chatSend");
  const input = document.getElementById("chatInput");
  const area = document.getElementById("chatMessages");

  if (!toggle || !box) return;

  const addMsg = (text, type) => {
    const div = document.createElement("div");
    div.className = `msg ${type}`;
    div.textContent = text;
    area.appendChild(div);
    area.scrollTop = area.scrollHeight;
  };

  toggle.addEventListener("click", () => {
    box.classList.toggle("open");
    if (area.children.length === 0) {
      addMsg("Assalomu alaykum! Ask anything: menu, order, delivery, support.", "bot");
    }
  });
  close?.addEventListener("click", () => box.classList.remove("open"));

  const sendMsg = async () => {
    const text = input.value.trim();
    if (!text) return;
    addMsg(text, "user");
    input.value = "";
    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text })
      });
      const data = await res.json();
      addMsg(data.response || "Xatolik yuz berdi.", "bot");
    } catch (_e) {
      addMsg("Server bilan ulanishda muammo.", "bot");
    }
  };

  send?.addEventListener("click", sendMsg);
  input?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMsg();
  });
}

function mountMobileBottomNav() {
  const current = window.location.pathname;
  const nav = document.createElement("div");
  nav.className = "mobile-bottom-nav";
  nav.innerHTML = `
    <a href="/" class="${current === "/" ? "active" : ""}">Home</a>
    <a href="/menu.html" class="${current.includes("menu") ? "active" : ""}">Menu</a>
    <a href="/cart.html" class="${current.includes("cart") ? "active" : ""}">Cart</a>
    <a href="/tracking.html" class="${current.includes("tracking") ? "active" : ""}">Orders</a>
  `;
  document.body.appendChild(nav);
}

document.addEventListener("DOMContentLoaded", () => {
  updateCartCount();
  mountChatbot();
  mountMobileBottomNav();
});
