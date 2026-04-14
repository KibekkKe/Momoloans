const express = require("express");
const bodyParser = require("body-parser");

const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Handle form submission
app.post("/submit", (req, res) => {
    const data = req.body;

    console.log("New Loan Application:");
    console.log(data);

    res.send(`
        <h2>Application Submitted Successfully</h2>
        <p>We will review your request and contact you shortly.</p>
    `);
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});
