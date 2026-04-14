const express = require("express");
const axios = require("axios");
const path = require("path");

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔐 USE ENV VARIABLES (IMPORTANT)
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

// Serve frontend
app.use(express.static(path.join(__dirname, "public")));

// Test route (IMPORTANT for Railway)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Handle form submission
app.post("/apply", async (req, res) => {
  const { name, phone, network, amount, nationalId } = req.body;

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
    console.error(error.response?.data || error.message);
    res.status(500).send("❌ Error sending application.");
  }
});

// PORT for Railway
const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
