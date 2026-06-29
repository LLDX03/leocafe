const express = require("express");
const cors = require("cors");
const compression = require("compression");
const path = require("path");
require("dotenv").config();

const app = express();

app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public"), { maxAge: "7d" }));

// Page routes
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "views", "login.html")));
app.get("/login", (req, res) => res.sendFile(path.join(__dirname, "views", "login.html")));
app.get("/index", (req, res) => res.sendFile(path.join(__dirname, "views", "index.html")));
app.get("/register", (req, res) => res.sendFile(path.join(__dirname, "views", "register.html")));
app.get("/order", (req, res) => res.sendFile(path.join(__dirname, "views", "order.html")));
app.get("/reserve", (req, res) => res.sendFile(path.join(__dirname, "views", "reserve.html")));
app.get("/rewards", (req, res) => res.sendFile(path.join(__dirname, "views", "rewards.html")));
app.get("/profile", (req, res) => res.sendFile(path.join(__dirname, "views", "profile.html")));
app.get("/qrpage", (req, res) => res.sendFile(path.join(__dirname, "views", "qrpage.html")));
app.get("/forgotpassword", (req, res) => res.sendFile(path.join(__dirname, "views", "forgotpassword.html")));
app.get("/order-status", (req, res) => res.sendFile(path.join(__dirname, "views", "order-status.html")));
app.get("/orders-history", (req, res) => res.sendFile(path.join(__dirname, "views", "orders.html")));

// API routes
app.use("/auth", require("./routes/auth"));
app.use("/reservations", require("./routes/reservations"));
app.use("/api/rewards", require("./routes/rewards"));
app.use("/api/profile", require("./routes/profile"));
app.use("/orders", require("./routes/orders"));

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
