let allItems = [];
let activeCategory = "Burger";
let activeFilter = "popular";

function mapCategory(category) {
  const c = String(category || "").toLowerCase();
  if (c.includes("burger") || c.includes("fast food")) return "Burger";
  if (c.includes("pizza") || c.includes("traditional")) return "Pizza";
  if (c.includes("drink") || c.includes("ichimlik")) return "Ichimlik";
  if (c.includes("dessert") || c.includes("desert")) return "Desert";
  return "Burger";
}

function renderMenu() {
  const grid = document.getElementById("menuGrid");
  let filtered = allItems.filter((i) => mapCategory(i.category) === activeCategory);
  if (activeFilter === "cheap") filtered = filtered.sort((a, b) => Number(a.price) - Number(b.price));
  if (activeFilter === "new") filtered = filtered.sort((a, b) => Number(b.id) - Number(a.id));
  if (activeFilter === "popular") filtered = filtered.sort((a, b) => Number(b.id) - Number(a.id));

  grid.innerHTML = filtered
    .map(
      (item) => `
    <div class="card">
      <img loading="lazy" src="${item.image}" alt="${item.name}" />
      <h3>${item.name}</h3>
      <p class="muted">${item.description || ""}</p>
      <p class="price">${money(item.price)} so'm</p>
      <button class="btn btn-primary" data-id="${item.id}">+ Add</button>
    </div>`
    )
    .join("");

  grid.querySelectorAll("button[data-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = allItems.find((x) => x.id === Number(btn.dataset.id));
      if (!item) return;
      addToCart(item);
    });
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const res = await fetch("/menu");
  allItems = await res.json();
  renderMenu();

  document.querySelectorAll(".cat").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      document.querySelectorAll(".cat").forEach((x) => x.classList.remove("active"));
      el.classList.add("active");
      activeCategory = el.dataset.cat;
      renderMenu();
    });
  });

  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach((x) => x.classList.remove("active"));
      btn.classList.add("active");
      activeFilter = btn.dataset.filter;
      renderMenu();
    });
  });
});
