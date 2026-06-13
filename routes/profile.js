const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db/db");
const router = express.Router();
const sgMail = require('@sendgrid/mail');


// Helper function to generate random 6-digit code
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}


// Middleware to verify JWT token
function authenticateToken(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.json({ success: false, message: "Not authenticated" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user.id = decoded.id;
    next();
  } catch (err) {
    res.json({ success: false, message: "Invalid token" });
  }
}

// sent email function
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendEmail(to, subject, text) {
  try {
    await sgMail.send({
      to: to,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: subject,
      text: text
    });
    console.log(`✅ Email sent to ${to}`);
    return true;
  } catch (err) {
    console.error("❌ Email error:", err);
    return false;
  }
}

/* ===== GET USER PROFILE ===== */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, username, email, points, tier, birthday, bookings, created_at AS \"createdAt\" FROM users WHERE id = $1",
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.json({ success: false, message: "User not found" });
    }

    res.json({
      success: true,
      user: result.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: "Server error" });
  }
});

/* ===== UPDATE BASIC INFO (username, birthday) ===== */
router.put("/update", authenticateToken, async (req, res) => {
  try {
    const { username, birthday } = req.body;

    if (!username) {
      return res.json({ success: false, message: "Username is required" });
    }

    await pool.query(
      "UPDATE users SET username = $1, birthday = $2 WHERE id = $3",
      [username, birthday || null, req.user.id]
    );

    res.json({ success: true, message: "Profile updated" });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: "Server error" });
  }
});

/* ===== SEND EMAIL VERIFICATION CODE ===== */
router.post("/send-email-code", authenticateToken, async (req, res) => {
  try {
    const { newEmail } = req.body;

    if (!newEmail) {
      return res.json({ success: false, message: "New email is required" });
    }

    // Get current user email
    const userResult = await pool.query(
      "SELECT email FROM users WHERE id = $1",
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.json({ success: false, message: "User not found" });
    }

    const currentEmail = userResult.rows[0].email;
    const code = generateCode();

    // Store code in database
    await pool.query(
      "INSERT INTO email_verification (user_id, email, code) VALUES ($1, $2, $3)",
      [req.user.id, newEmail, code]
    );

    // Send email with code
    const emailSent = await sendEmail(
      currentEmail,
      "Email Verification Code - Leo's Cafe",
      `Your verification code to change your email is: ${code}\n\nThis code expires in 15 minutes.\n\nIf you didn't request this, please ignore this email.`
    );

    if (!emailSent) {
      return res.json({ success: false, message: "Error sending email" });
    }

    res.json({ success: true, message: "Verification code sent to your current email" });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: "Server error" });
  }
});

/* ===== VERIFY EMAIL CODE & CHANGE EMAIL ===== */
router.post("/verify-email-change", authenticateToken, async (req, res) => {
  try {
    const { newEmail, code } = req.body;

    if (!newEmail || !code) {
      return res.json({ success: false, message: "Missing required fields" });
    }

    // Verify code (must be valid, not expired, and not already used)
    const codeResult = await pool.query(
      "SELECT * FROM email_verification WHERE user_id = $1 AND email = $2 AND code = $3 AND expires_at > NOW() AND verified = FALSE",
      [req.user.id, newEmail, code]
    );

    if (codeResult.rows.length === 0) {
      return res.json({ success: false, message: "Invalid or expired code" });
    }

    // Update user email
    await pool.query(
      "UPDATE users SET email = $1 WHERE id = $2",
      [newEmail, req.user.id]
    );

    // Mark code as verified (can't reuse it)
    await pool.query(
      "UPDATE email_verification SET verified = TRUE WHERE id = $1",
      [codeResult.rows[0].id]
    );

    res.json({ success: true, message: "Email updated successfully" });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: "Server error" });
  }
});

/* ===== SEND PASSWORD CHANGE CODE ===== */
router.post("/send-password-code", authenticateToken, async (req, res) => {
  try {
    const { currentPassword } = req.body;

    if (!currentPassword) {
      return res.json({ success: false, message: "Current password is required" });
    }

    // Get user (password + email)
    const userResult = await pool.query(
      "SELECT password, email FROM users WHERE id = $1",
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.json({ success: false, message: "User not found" });
    }

    // Verify current password matches
    const passwordMatch = await bcrypt.compare(
      currentPassword,
      userResult.rows[0].password
    );

    if (!passwordMatch) {
      return res.json({ success: false, message: "Incorrect password" });
    }

    const userEmail = userResult.rows[0].email;
    const code = generateCode();

    // Store code in database
    await pool.query(
      "INSERT INTO email_verification (user_id, email, code) VALUES ($1, $2, $3)",
      [req.user.id, userEmail, code]
    );

    // Send email with code
    const emailSent = await sendEmail(
      userEmail,
      "Password Change Verification Code - Leo's Cafe",
      `Your verification code to change your password is: ${code}\n\nThis code expires in 15 minutes.\n\nIf you didn't request this, please ignore this email.`
    );

    if (!emailSent) {
      return res.json({ success: false, message: "Error sending email" });
    }

    res.json({ success: true, message: "Verification code sent to your email" });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: "Server error" });
  }
});

/* ===== CHANGE PASSWORD ===== */
router.put("/change-password", authenticateToken, async (req, res) => {
  try {
    const { newPassword, code } = req.body;

    if (!newPassword || !code) {
      return res.json({ success: false, message: "Missing required fields" });
    }

    if (newPassword.length < 6) {
      return res.json({ success: false, message: "Password must be at least 6 characters" });
    }

    // Get user email
    const userResult = await pool.query(
      "SELECT email FROM users WHERE id = $1",
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.json({ success: false, message: "User not found" });
    }

    // Verify code (must be valid, not expired, and not already used)
    const codeResult = await pool.query(
      "SELECT * FROM email_verification WHERE user_id = $1 AND email = $2 AND code = $3 AND expires_at > NOW() AND verified = FALSE",
      [req.user.id, userResult.rows[0].email, code]
    );

    if (codeResult.rows.length === 0) {
      return res.json({ success: false, message: "Invalid or expired code" });
    }

    // Hash new password
    const hashed = await bcrypt.hash(newPassword, 10);

    // Update password in database
    await pool.query(
      "UPDATE users SET password = $1 WHERE id = $2",
      [hashed, req.user.id]
    );

    // Mark code as verified (can't reuse it)
    await pool.query(
      "UPDATE email_verification SET verified = TRUE WHERE id = $1",
      [codeResult.rows[0].id]
    );

    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: "Server error" });
  }
});

module.exports = router;