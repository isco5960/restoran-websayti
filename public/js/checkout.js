function checkoutSummary() {
  const items = getCart();
  const wrap = document.getElementById("checkoutItems");
  const totalEl = document.getElementById("checkoutTotal");
  const deliveryType = localStorage.getItem("deliveryType") || "delivery";
  const deliveryFee = deliveryType === "pickup" ? 0 : 15000;
  wrap.innerHTML = items
    .map((i) => `<div>${i.name} x ${i.qty} = ${money(i.price * i.qty)} so'm</div>`)
    .join("");
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const total = subtotal + deliveryFee;
  wrap.innerHTML += `<br /><div>Yetkazish (${deliveryType}): ${money(deliveryFee)} so'm</div>`;
  totalEl.textContent = money(total);
  return { items, total };
}

document.addEventListener("DOMContentLoaded", () => {
  const deliveryType = localStorage.getItem("deliveryType") || "delivery";
  document.getElementById("confirmBtn")?.addEventListener("click", async () => {
    const { items, total } = checkoutSummary();
    const phone = document.getElementById("phone").value.trim();
    const address = document.getElementById("address").value.trim();
    const deliveryTime = document.getElementById("deliveryTime").value;
    const paymentProvider = document.getElementById("paymentProvider").value;

    if (!phone) {
      alert("Telefon raqam kiriting.");
      return;
    }
    if (items.length === 0) {
      alert("Savat bo'sh.");
      return;
    }

    try {
      const res = await fetch("/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ id: i.id, name: i.name, qty: i.qty, price: i.price })),
          total_price: Math.round(total),
          customer: { name: "Guest", phone, address, deliveryTime, deliveryType },
          payment_provider: paymentProvider
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Buyurtma yuborilmadi.");
      }

      localStorage.setItem("lastOrderId", String(data.orderId));
      localStorage.setItem("lastTransactionId", String(data.transaction_id));
      window.location.href = data.payment_url;
    } catch (err) {
      alert(err.message || "Xatolik yuz berdi.");
    }
  });
});
