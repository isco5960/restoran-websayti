document.addEventListener("DOMContentLoaded", async () => {
  const wrap = document.getElementById("topMenu");
  if (!wrap) return;

  const items = await loadTopMenu(6);
  wrap.innerHTML = items
    .map(
      (item, idx) => `
    <div class="card">
      <img loading="lazy" src="${item.image}" alt="${item.name}" />
      <span class="badge">${idx < 2 ? "Most popular" : "Limited time offer"}</span>
      <h3>${item.name}</h3>
      <p class="muted">${item.description || ""}</p>
      <p class="price">${money(item.price)} so'm</p>
      <button class="btn btn-primary" data-id="${item.id}">+ Add</button>
    </div>`
    )
    .join("");

  wrap.querySelectorAll("button[data-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = items.find((x) => x.id === Number(btn.dataset.id));
      if (!item) return;
      addToCart(item);
    });
  });
});
