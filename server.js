require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
const { initDb, run, get, all } = require("./db");

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const QULAYPAY_API_KEY = process.env.QULAYPAY_API_KEY || "";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || process.env.AI_API_KEY || "";
const APP_BASE_URL = process.env.APP_BASE_URL || `http://localhost:${PORT}`;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

async function createQulayTransaction({ amount, comment, provider, redirectUrl }) {
  const response = await fetch("https://api.qulaypay.uz/transaction/create", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${QULAYPAY_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      access_token: QULAYPAY_API_KEY,
      amount,
      comment,
      provider,
      redirect_url: redirectUrl
    })
  });

  const data = await response.json();
  if (!response.ok || data?.status !== "success") {
    const message = data?.message || "QulayPay tranzaksiya yaratilmadi.";
    throw new Error(message);
  }
  return data.transaction;
}

async function askOpenRouter({ message, menuItems }) {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY sozlanmagan.");
  }

  const menuText = menuItems
    .slice(0, 20)
    .map((m) => `${m.name} - ${m.price} so'm (${m.category})`)
    .join("; ");

  const systemPrompt = `
Sen restoran sayti uchun aqlli yordamchisan.
Vazifalaring:
- Menu tavsiya qilish
- Eng arzon yoki eng mos taomni topish
- Buyurtma jarayonida yo'l-yo'riq berish
- Yetkazish va online to'lov (QulayPay) haqida tushuntirish
- Adminga buyurtmalar, top sotuvlar, feedback bo'yicha qisqa yordam berish

Muhim:
- Javobni foydalanuvchi tili/uslubida ber.
- 2-5 jumla orasida, aniq va amaliy javob ber.
- Agar taom tavsiya qilinsa, narx bilan yoz.
- Sayt menyusi: ${menuText}
- Yetkazish: odatda 15-30 min.
- To'lov: faqat online, Click/Payme orqali QulayPay.
`.trim();

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      temperature: 0.5,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ]
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || data?.message || "AI servis xatosi.");
  }

  const reply = data?.choices?.[0]?.message?.content?.trim();
  if (!reply) throw new Error("AI javobi bo'sh keldi.");
  return reply;
}

function auth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Token kerak." });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ message: "Token xato." });
  }
}

function adminOnly(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Faqat admin uchun." });
  }
  next();
}

// User APIs
app.post("/register", async (req, res) => {
  try {
    const { name, phone, password } = req.body;
    if (!name || !phone || !password) {
      return res.status(400).json({ message: "name, phone, password majburiy." });
    }

    const hashed = await bcrypt.hash(password, 10);
    await run("INSERT INTO users (name, phone, password, role) VALUES (?, ?, ?, ?)", [
      name,
      phone,
      hashed,
      "user"
    ]);
    res.json({ message: "Ro'yxatdan o'tish muvaffaqiyatli." });
  } catch (err) {
    res.status(400).json({ message: "Bu phone allaqachon mavjud." });
  }
});

app.post("/login", async (req, res) => {
  const { phone, password } = req.body;
  const user = await get("SELECT * FROM users WHERE phone = ?", [phone]);
  if (!user) return res.status(401).json({ message: "Foydalanuvchi topilmadi." });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ message: "Parol xato." });

  const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, {
    expiresIn: "7d"
  });
  res.json({ token });
});

app.get("/profile", auth, async (req, res) => {
  const user = await get("SELECT id, name, phone, role FROM users WHERE id = ?", [req.user.id]);
  res.json(user);
});

// Menu APIs
app.get("/menu", async (_req, res) => {
  const rows = await all("SELECT * FROM menu ORDER BY id DESC");
  res.json(rows);
});

app.post("/menu", auth, adminOnly, async (req, res) => {
  const { name, price, category, image, description } = req.body;
  if (!name || !price || !category) {
    return res.status(400).json({ message: "name, price, category majburiy." });
  }
  const result = await run(
    "INSERT INTO menu (name, price, category, image, description) VALUES (?, ?, ?, ?, ?)",
    [name, price, category, image || "", description || ""]
  );
  res.json({ id: result.lastID, message: "Menu item qo'shildi." });
});

app.put("/menu/:id", auth, adminOnly, async (req, res) => {
  const { name, price, category, image, description } = req.body;
  const current = await get("SELECT * FROM menu WHERE id = ?", [req.params.id]);
  if (!current) return res.status(404).json({ message: "Menu item topilmadi." });

  await run(
    "UPDATE menu SET name = ?, price = ?, category = ?, image = ?, description = ? WHERE id = ?",
    [
      name || current.name,
      price || current.price,
      category || current.category,
      image || current.image,
      description || current.description,
      req.params.id
    ]
  );
  res.json({ message: "Menu item yangilandi." });
});

app.delete("/menu/:id", auth, adminOnly, async (req, res) => {
  await run("DELETE FROM menu WHERE id = ?", [req.params.id]);
  res.json({ message: "Menu item o'chirildi." });
});

// Order APIs
app.post("/order", async (req, res) => {
  const { user_id, items, total_price, customer, payment_provider } = req.body;
  if (!items || !Array.isArray(items) || !total_price || !customer?.name || !customer?.phone) {
    return res.status(400).json({ message: "items, total_price, customer.name, customer.phone majburiy." });
  }
  if (!QULAYPAY_API_KEY) {
    return res.status(500).json({ message: "QULAYPAY_API_KEY sozlanmagan." });
  }
  if (!Number.isInteger(Number(total_price)) || Number(total_price) <= 0) {
    return res.status(400).json({ message: "total_price butun son va musbat bo'lishi kerak." });
  }

  const provider = payment_provider === "payme" ? "payme" : "click";
  const amount = Number(total_price);

  try {
    const tempOrder = await run(
      `INSERT INTO orders (
        user_id, items, total_price, status,
        customer_name, customer_phone, customer_address,
        payment_provider, payment_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id || null,
        JSON.stringify(items),
        amount,
        "Yangi",
        customer.name,
        customer.phone,
        customer.address || "",
        provider,
        "pending"
      ]
    );

    const orderId = tempOrder.lastID;
    const comment = `Buyurtma #${orderId} uchun to'lov`;
    const redirectUrl = `${APP_BASE_URL}/payment-success.html?order_id=${orderId}`;
    const transaction = await createQulayTransaction({
      amount,
      comment,
      provider,
      redirectUrl
    });

    await run(
      "UPDATE orders SET transaction_id = ?, payment_url = ? WHERE id = ?",
      [transaction.id, transaction.payment_url, orderId]
    );

    res.json({
      orderId,
      transaction_id: transaction.id,
      payment_url: transaction.payment_url,
      payment_status: transaction.status
    });
  } catch (err) {
    res.status(502).json({ message: `To'lov servisida xatolik: ${err.message}` });
  }
});

app.get("/orders", auth, async (req, res) => {
  if (req.user.role === "admin") {
    const rows = await all("SELECT * FROM orders ORDER BY id DESC");
    return res.json(rows);
  }
  const rows = await all("SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC", [req.user.id]);
  res.json(rows);
});

app.put("/order/status/:id", auth, adminOnly, async (req, res) => {
  const { status } = req.body;
  const allowed = ["Yangi", "Tayyorlanmoqda", "Yetkazildi"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ message: "Status noto'g'ri." });
  }
  await run("UPDATE orders SET status = ? WHERE id = ?", [status, req.params.id]);
  res.json({ message: "Status yangilandi." });
});

app.get("/payment/status/:transactionId", async (req, res) => {
  const row = await get(
    "SELECT id, status, payment_status, transaction_id, total_price FROM orders WHERE transaction_id = ?",
    [req.params.transactionId]
  );
  if (!row) return res.status(404).json({ message: "Tranzaksiya topilmadi." });
  res.json(row);
});

app.post("/webhook/qulaypay", async (req, res) => {
  const { event, transaction_id, amount, status } = req.body || {};

  if (event !== "payment_success" || status !== "success" || !transaction_id) {
    return res.status(400).json({ received: false, message: "Noto'g'ri webhook body." });
  }

  const order = await get("SELECT id, total_price FROM orders WHERE transaction_id = ?", [transaction_id]);
  if (!order) return res.status(404).json({ received: false, message: "Order topilmadi." });
  if (Number(order.total_price) !== Number(amount)) {
    return res.status(400).json({ received: false, message: "Summa mos emas." });
  }

  await run(
    "UPDATE orders SET payment_status = ?, status = ? WHERE transaction_id = ?",
    ["paid", "Tayyorlanmoqda", transaction_id]
  );

  return res.status(200).json({ received: true });
});

// Chatbot API
app.post("/chat", async (req, res) => {
  const { user_id, message } = req.body;
  if (!message) return res.status(400).json({ message: "Xabar bo'sh bo'lmasin." });

  try {
    const menuItems = await all("SELECT name, price, category FROM menu ORDER BY id DESC");
    const response = await askOpenRouter({ message, menuItems });

    await run(
      "INSERT INTO chat_history (user_id, message, response) VALUES (?, ?, ?)",
      [user_id || null, message, response]
    );

    res.json({ response });
  } catch (err) {
    const fallback = "Hozircha AI chatda uzilish bor. Menyu, buyurtma yoki to'lov haqida qayta yozib ko'ring.";
    await run(
      "INSERT INTO chat_history (user_id, message, response) VALUES (?, ?, ?)",
      [user_id || null, message, fallback]
    );
    res.json({ response: fallback });
  }
});

// Admin analytics (chatbot/admin requirements)
app.get("/admin/top-items", auth, adminOnly, async (_req, res) => {
  const orders = await all("SELECT items FROM orders");
  const counts = {};
  orders.forEach((order) => {
    try {
      const parsed = JSON.parse(order.items);
      parsed.forEach((item) => {
        counts[item.name] = (counts[item.name] || 0) + (item.qty || 1);
      });
    } catch (_e) {}
  });
  const top = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, qty]) => ({ name, qty }));
  res.json(top);
});

app.get("/admin/feedback", auth, adminOnly, async (_req, res) => {
  const rows = await all(
    "SELECT id, user_id, message, response, created_at FROM chat_history ORDER BY id DESC LIMIT 50"
  );
  res.json(rows);
});

app.get("/admin/stats", auth, adminOnly, async (_req, res) => {
  const dailyRevenue = await get(
    `SELECT COALESCE(SUM(total_price), 0) as revenue
     FROM orders
     WHERE payment_status = 'paid' AND DATE(created_at) = DATE('now')`
  );
  const totalOrders = await get("SELECT COUNT(*) as count FROM orders");
  res.json({
    daily_revenue: Number(dailyRevenue?.revenue || 0),
    total_orders: Number(totalOrders?.count || 0)
  });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
