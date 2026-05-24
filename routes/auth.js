const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db/db");
const authMiddleware = require("../middleware/auth");

router.post("/register", async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const hashed = await bcrypt.hash(password, 10);
        await pool.query(
            "INSERT INTO users (username, email, password, points, tier, bookings) VALUES ($1, $2, $3, $4, $5, $6)",
            [username, email, hashed, 0, "Bronze", 0]
        );
        res.json({ success: true });
    } catch (err) {
        console.log(err);
        res.json({ success: false });
    }
});

router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    try {
        console.log("LOGIN ATTEMPT:", email);
        const result = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
        );
        if (result.rows.length === 0) {
            console.log("NO USER FOUND");
            return res.json({ success: false, message: "User not found" });
        }
        const user = result.rows[0];
        console.log("USER FOUND:", user.email);
        const match = await bcrypt.compare(password, user.password);
        console.log("PASSWORD MATCH:", match);
        if (!match) {
            return res.json({ success: false, message: "Wrong password" });
        }
        const token = jwt.sign(
            { id: user.id },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );
        return res.json({ success: true, token });
    } catch (err) {
        console.log(err);
        return res.json({ success: false, message: "Server error" });
    }
});

router.get("/me", authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT username, email, points, tier, birthday, bookings FROM users WHERE id = $1",
            [req.user.id]
        );
        res.json({ success: true, user: result.rows[0] });
    } catch (err) {
        console.log(err);
        res.json({ success: false });
    }
});

module.exports = router;