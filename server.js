const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const pool = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

/* ---------------- REGISTER ---------------- */
app.post("/register", async (req, res) => {
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
/* ---------------- LOGIN ---------------- */
app.post("/login", async (req, res) => {
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
            return res.json({
                success: false,
                message: "Wrong password"
            });
        }

        const token = jwt.sign(
            { id: user.id },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        return res.json({
            success: true,
            token
        });



    } catch (err) {
        console.log(err);
        return res.json({ success: false, message: "Server error" });
    }
});

/* ---------------- GET USER ---------------- */
app.get("/me", async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];

        if (!token) return res.json({ success: false });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const result = await pool.query(
            "SELECT username, email, points, tier, birthday, bookings FROM users WHERE id = $1",
            [decoded.id]
        );

        res.json({
            success: true,
            user: result.rows[0]
        });

    } catch (err) {
        console.log(err);
        res.json({ success: false });
    }
});

/* ---------------- REDEEM REWARD ---------------- */
app.post("/redeem", async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];

        if (!token) return res.json({ success: false, message: "Not authenticated" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;

        const { pointsDeducted, rewardName, redemptionId } = req.body;

        // Validate input
        if (!pointsDeducted || !rewardName || !redemptionId) {
            return res.json({ success: false, message: "Missing required fields" });
        }

        // Check if user has enough points
        const userResult = await pool.query(
            "SELECT points FROM users WHERE id = $1",
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.json({ success: false, message: "User not found" });
        }

        const currentPoints = userResult.rows[0].points;

        if (currentPoints < pointsDeducted) {
            return res.json({ success: false, message: "Not enough points" });
        }

        // Deduct points from user
        await pool.query(
            "UPDATE users SET points = points - $1 WHERE id = $2",
            [pointsDeducted, userId]
        );

        // Optional: Save redemption history (create this table if you want)
        await pool.query(
            "INSERT INTO redemptions (user_id, reward_name, points_deducted, redemption_id, created_at) VALUES ($1, $2, $3, $4, NOW())",
            [userId, rewardName, pointsDeducted, redemptionId]
        );

        res.json({
            success: true,
            message: "Reward redeemed successfully",
            newPoints: currentPoints - pointsDeducted
        });

    } catch (err) {
        console.log(err);
        res.json({ success: false, message: "Server error" });
    }
});

/* ---------------- GET USER RESERVATIONS ---------------- */
app.get("/reservations", async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];

        if (!token) return res.json({ success: false, message: "Not authenticated" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;

        const result = await pool.query(
            "SELECT id, date, time, guests, special_requests, status, created_at FROM reservations WHERE user_id = $1 AND status = 'confirmed' ORDER BY date DESC",
            [userId]
        );

        res.json({
            success: true,
            reservations: result.rows
        });

    } catch (err) {
        console.log(err);
        res.json({ success: false, message: "Server error" });
    }
});

/* ---------------- CREATE RESERVATION ---------------- */
app.post("/reservations", async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];

        if (!token) return res.json({ success: false, message: "Not authenticated" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;

        const { date, time, guests, specialRequests } = req.body;

        // Validate input
        if (!date || !time || !guests) {
            return res.json({ success: false, message: "Missing required fields" });
        }

        // Insert reservation
        const result = await pool.query(
            "INSERT INTO reservations (user_id, date, time, guests, special_requests, status) VALUES ($1, $2, $3, $4, $5, 'confirmed') RETURNING id, date, time, guests, special_requests, status, created_at",
            [userId, date, time, guests, specialRequests || null]
        );

        res.json({
            success: true,
            message: "Reservation confirmed",
            reservation: result.rows[0]
        });

    } catch (err) {
        console.log(err);
        res.json({ success: false, message: "Server error" });
    }
});

/* ---------------- CANCEL RESERVATION ---------------- */
app.delete("/reservations/:id", async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];

        if (!token) return res.json({ success: false, message: "Not authenticated" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        const reservationId = req.params.id;

        // Verify reservation belongs to user
        const checkResult = await pool.query(
            "SELECT id FROM reservations WHERE id = $1 AND user_id = $2",
            [reservationId, userId]
        );

        if (checkResult.rows.length === 0) {
            return res.json({ success: false, message: "Reservation not found or not yours" });
        }

        // Delete reservation
        await pool.query(
            "DELETE FROM reservations WHERE id = $1",
            [reservationId]
        );

        res.json({
            success: true,
            message: "Reservation cancelled"
        });

    } catch (err) {
        console.log(err);
        res.json({ success: false, message: "Server error" });
    }
});

app.listen(3000, () => {
    console.log("Server running on port 3000");
});