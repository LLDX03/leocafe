const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db/db");
const authMiddleware = require("../middleware/auth");
const sgMail = require('@sendgrid/mail');


router.post("/register", async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const hashed = await bcrypt.hash(password, 10);
        await pool.query(
            "INSERT INTO users (username, email, password, points, total_points, tier, bookings) VALUES ($1, $2, $3, $4, $5, $6, $7)",
            [username, email, hashed, 0, 0, "Bronze", 0]
        );
        res.json({ success: true });
    } catch (err) {
        console.log(err);
        if (err.code === "23505") {
            return res.json({ success: false, message: "Email already in use" });
        }
        res.json({ success: false, message: "Server error" });
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
            "SELECT username, email, points, total_points, tier, birthday, bookings FROM users WHERE id = $1", [req.user.id]
        );
        res.json({ success: true, user: result.rows[0] });
    } catch (err) {
        console.log(err);
        res.json({ success: false });
    }
});


router.post("/add-points", authMiddleware, async (req, res) => {
    try {
        const { points } = req.body;
        if (!points || points <= 0) {
            return res.json({ success: false, message: "Invalid points" });
        }
        await pool.query(
            "UPDATE users SET points = points + $1 WHERE id = $2",
            [points, req.user.id]
        );
        res.json({ success: true });
    } catch (err) {
        console.log(err);
        res.json({ success: false, message: "Server error" });
    }
});


sgMail.setApiKey(process.env.SENDGRID_API_KEY);

function generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendEmail(to, subject, text) {
    try {
        await sgMail.send({
            to,
            from: process.env.SENDGRID_FROM_EMAIL,
            subject,
            text
        });
        return true;
    } catch (err) {
        console.error("❌ Email error:", err);
        return false;
    }
}

router.post("/forgot-password", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.json({ success: false, message: "Email is required" });

    try {
        const result = await pool.query(
            "SELECT id FROM users WHERE email = $1", [email]
        );

        if (result.rows.length === 0)
            return res.json({ success: true, message: "If that email exists, a code has been sent." });

        const userId = result.rows[0].id;
        const code = generateCode();

        await pool.query(
            "INSERT INTO email_verification (user_id, email, code) VALUES ($1, $2, $3)",
            [userId, email, code]
        );

        await sendEmail(
            email,
            "Reset Your Password — Leo's Cafe",
            `Your password reset code is: ${code}\n\nThis code expires in 15 minutes.\n\nIf you didn't request this, please ignore this email.`
        );

        res.json({ success: true, message: "If that email exists, a code has been sent." });

    } catch (err) {
        console.error(err);
        res.json({ success: false, message: "Server error" });
    }
});

router.post("/reset-password", async (req, res) => {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword)
        return res.json({ success: false, message: "All fields are required" });

    if (newPassword.length < 8)
        return res.json({ success: false, message: "Password must be at least 8 characters" });

    try {
        const userResult = await pool.query(
            "SELECT id FROM users WHERE email = $1", [email]
        );

        if (userResult.rows.length === 0)
            return res.json({ success: false, message: "Invalid request" });

        const userId = userResult.rows[0].id;

        const codeResult = await pool.query(
            "SELECT id FROM email_verification WHERE user_id = $1 AND email = $2 AND code = $3 AND expires_at > NOW() AND verified = FALSE",
            [userId, email, code]
        );

        if (codeResult.rows.length === 0)
            return res.json({ success: false, message: "Invalid or expired code" });

        const hashed = await bcrypt.hash(newPassword, 10);
        await pool.query("UPDATE users SET password = $1 WHERE id = $2", [hashed, userId]);

        await pool.query(
            "UPDATE email_verification SET verified = TRUE WHERE id = $1",
            [codeResult.rows[0].id]
        );

        res.json({ success: true, message: "Password reset successfully" });

    } catch (err) {
        console.error(err);
        res.json({ success: false, message: "Server error" });
    }
});


module.exports = router;