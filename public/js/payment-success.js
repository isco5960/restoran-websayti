document.addEventListener("DOMContentLoaded", async () => {
  const info = document.getElementById("paymentInfo");
  const txId = localStorage.getItem("lastTransactionId");

  if (!txId) {
    info.textContent = "Tranzaksiya ID topilmadi. Iltimos qayta urinib ko'ring.";
    return;
  }

  try {
    const res = await fetch(`/payment/status/${txId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Holatni tekshirib bo'lmadi.");

    if (data.payment_status === "paid") {
      info.textContent = `To'lov muvaffaqiyatli. Order #${data.id} qabul qilindi.`;
      setCart([]);
      updateCartCount();
      localStorage.removeItem("lastTransactionId");
    } else {
      info.textContent = "To'lov hali yakunlanmagan. Iltimos bir necha daqiqadan keyin qayta tekshiring.";
    }
  } catch (err) {
    info.textContent = err.message || "Xatolik yuz berdi.";
  }
});
