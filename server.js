const express = require("express");
const cors = require("cors");
require("dotenv").config();

const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "views", "index.html")));
app.get("/login", (req, res) => res.sendFile(path.join(__dirname, "views", "login.html")));
app.get("/register", (req, res) => res.sendFile(path.join(__dirname, "views", "register.html")));
app.get("/order", (req, res) => res.sendFile(path.join(__dirname, "views", "order.html")));
app.get("/reserve", (req, res) => res.sendFile(path.join(__dirname, "views", "reserve.html")));
app.get("/rewards", (req, res) => res.sendFile(path.join(__dirname, "views", "rewards.html")));
app.get("/profile", (req, res) => res.sendFile(path.join(__dirname, "views", "profile.html")));
app.get("/qrpage", (req, res) => res.sendFile(path.join(__dirname, "views", "qrpage.html")));
app.get("/forgotpassword", (req, res) => res.sendFile(path.join(__dirname, "views", "forgotpassword.html")));

// Routes
app.use("/auth", require("./routes/auth"));
app.use("/reservations", require("./routes/reservations"));
app.use("/rewards", require("./routes/rewards"));
app.use("/profile", require("./routes/profile"));  


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
