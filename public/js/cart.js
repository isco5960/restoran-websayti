function calcTotal(cart, promo = "") {
  let total = cart.reduce((s, i) => s + Number(i.price) * i.qty, 0);
  if (promo.trim().toUpperCase() === "PROMO10") total *= 0.9;
  return Math.round(total);
}

function renderCart() {
  const wrap = document.getElementById("cartItems");
  const totalEl = document.getElementById("totalPrice");
  const deliveryEl = document.getElementById("deliveryPrice");
  const deliveryType = document.getElementById("deliveryType");
  const promoInput = document.getElementById("promoInput");
  let cart = getCart();

  if (cart.length === 0) {
    wrap.innerHTML = `<p class="muted">Savat bo'sh.</p>`;
    totalEl.textContent = "0";
    return;
  }

  wrap.innerHTML = cart
    .map(
      (item) => `
      <div class="cart-row">
        <div><strong>${item.name}</strong><br /><span class="muted">${money(item.price)} so'm</span></div>
        <div class="qty">
          <button data-id="${item.id}" data-op="-">-</button>
          <span>${item.qty}</span>
          <button data-id="${item.id}" data-op="+">+</button>
        </div>
        <div>${money(Number(item.price) * item.qty)} so'm</div>
      </div>
    `
    )
    .join("");

  const deliveryFee = deliveryType?.value === "pickup" ? 0 : 15000;
  const subtotal = calcTotal(cart, promoInput.value);
  deliveryEl.textContent = money(deliveryFee);
  totalEl.textContent = money(subtotal + deliveryFee);
  localStorage.setItem("deliveryType", deliveryType?.value || "delivery");

  wrap.querySelectorAll("button[data-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      cart = getCart();
      const item = cart.find((x) => x.id === Number(btn.dataset.id));
      if (!item) return;
      item.qty += btn.dataset.op === "+" ? 1 : -1;
      if (item.qty <= 0) cart = cart.filter((x) => x.id !== item.id);
      setCart(cart);
      updateCartCount();
      renderCart();
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const savedDeliveryType = localStorage.getItem("deliveryType") || "delivery";
  const deliveryType = document.getElementById("deliveryType");
  if (deliveryType) deliveryType.value = savedDeliveryType;
  renderCart();
  document.getElementById("promoInput")?.addEventListener("input", renderCart);
  document.getElementById("deliveryType")?.addEventListener("change", renderCart);
});
