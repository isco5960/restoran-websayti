const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const bcrypt = require("bcryptjs");

const db = new sqlite3.Database(path.join(__dirname, "restoran.db"));

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

async function initDb() {
  await run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user'
  )`);

  await run(`CREATE TABLE IF NOT EXISTS menu (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    category TEXT NOT NULL,
    image TEXT,
    description TEXT
  )`);

  await run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    items TEXT NOT NULL,
    total_price REAL NOT NULL,
    status TEXT DEFAULT 'Pending',
    customer_name TEXT,
    customer_phone TEXT,
    customer_address TEXT,
    payment_provider TEXT,
    payment_status TEXT DEFAULT 'unpaid',
    transaction_id TEXT,
    payment_url TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  await run(`CREATE TABLE IF NOT EXISTS chat_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    message TEXT NOT NULL,
    response TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  const countRow = await get("SELECT COUNT(*) as count FROM menu");
  if (countRow.count === 0) {
    const seedItems = [
      ["Cheese Burger", 35000, "Burger", "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600", "Mazali mol go'shtli burger"],
      ["Chicken Burger", 32000, "Burger", "https://images.unsplash.com/photo-1550547660-d9450f859349?w=600", "Qarsildoq tovuqli burger"],
      ["Pepperoni Pizza", 58000, "Pizza", "https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?w=600", "Pishloqli va pepperonili pizza"],
      ["Margherita Pizza", 52000, "Pizza", "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600", "Klassik italyan pizza"],
      ["Cola", 12000, "Ichimlik", "https://images.unsplash.com/photo-1581636625402-29b2a704ef13?w=600", "Muzdek cola ichimligi"],
      ["Mojito", 18000, "Ichimlik", "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600", "Limon va yalpizli salqin ichimlik"],
      ["Chocolate Cake", 26000, "Desert", "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600", "Shokoladli yumshoq tort"],
      ["Baklava", 20000, "Desert", "https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?w=600", "An'anaviy shirin baklava"]
    ];

    for (const item of seedItems) {
      await run(
        "INSERT INTO menu (name, price, category, image, description) VALUES (?, ?, ?, ?, ?)",
        item
      );
    }
  }

  await ensureOrderColumns();
  await ensureCoreMenuItems();
  await ensureDefaultAdmin();
}

async function ensureOrderColumns() {
  const cols = await all("PRAGMA table_info(orders)");
  const names = cols.map((c) => c.name);

  const needed = [
    { name: "customer_name", sql: "ALTER TABLE orders ADD COLUMN customer_name TEXT" },
    { name: "customer_phone", sql: "ALTER TABLE orders ADD COLUMN customer_phone TEXT" },
    { name: "customer_address", sql: "ALTER TABLE orders ADD COLUMN customer_address TEXT" },
    { name: "payment_provider", sql: "ALTER TABLE orders ADD COLUMN payment_provider TEXT" },
    { name: "payment_status", sql: "ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT 'unpaid'" },
    { name: "transaction_id", sql: "ALTER TABLE orders ADD COLUMN transaction_id TEXT" },
    { name: "payment_url", sql: "ALTER TABLE orders ADD COLUMN payment_url TEXT" }
  ];

  for (const col of needed) {
    if (!names.includes(col.name)) {
      await run(col.sql);
    }
  }
}

async function ensureDefaultAdmin() {
  const admin = await get("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
  if (admin) return;

  const passwordHash = await bcrypt.hash("Admin123!", 10);
  await run(
    "INSERT INTO users (name, phone, password, role) VALUES (?, ?, ?, ?)",
    ["Super Admin", "+998900000001", passwordHash, "admin"]
  );
}

async function ensureCoreMenuItems() {
  const required = [
    ["Pepperoni Pizza", 58000, "Pizza", "https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?w=600", "Pishloqli va pepperonili pizza"],
    ["Cheese Burger", 35000, "Burger", "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600", "Mazali mol go'shtli burger"],
    ["Cola", 12000, "Ichimlik", "https://images.unsplash.com/photo-1581636625402-29b2a704ef13?w=600", "Muzdek cola ichimligi"],
    ["Chocolate Cake", 26000, "Desert", "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600", "Shokoladli yumshoq tort"]
  ];

  for (const item of required) {
    const exists = await get("SELECT id FROM menu WHERE name = ? LIMIT 1", [item[0]]);
    if (!exists) {
      await run(
        "INSERT INTO menu (name, price, category, image, description) VALUES (?, ?, ?, ?, ?)",
        item
      );
    }
  }
}

module.exports = { db, run, all, get, initDb };
