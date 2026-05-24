const express = require("express");
const router = express.Router();
const pool = require("../db/db");
const authMiddleware = require("../middleware/auth");

router.get("/", authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, date, time, guests, special_requests, status, created_at 
             FROM reservations 
             WHERE user_id = $1 
             AND status = 'confirmed'
             AND (date > CURRENT_DATE OR (date = CURRENT_DATE AND time > TO_CHAR(NOW(), 'HH12:MI AM')))
             ORDER BY date ASC`,
            [req.user.id]
        );
        res.json({ success: true, reservations: result.rows });
    } catch (err) {
        console.log(err);
        res.json({ success: false, message: "Server error" });
    }
});

router.post("/", authMiddleware, async (req, res) => {
    try {
        const { date, time, guests, specialRequests } = req.body;
        if (!date || !time || !guests) {
            return res.json({ success: false, message: "Missing required fields" });
        }
        const result = await pool.query(
            "INSERT INTO reservations (user_id, date, time, guests, special_requests, status) VALUES ($1, $2, $3, $4, $5, 'confirmed') RETURNING id, date, time, guests, special_requests, status, created_at",
            [req.user.id, date, time, guests, specialRequests || null]
        );
        res.json({ success: true, message: "Reservation confirmed", reservation: result.rows[0] });
    } catch (err) {
        console.log(err);
        res.json({ success: false, message: "Server error" });
    }
});

router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        const reservationId = req.params.id;
        const checkResult = await pool.query(
            "SELECT id FROM reservations WHERE id = $1 AND user_id = $2",
            [reservationId, req.user.id]
        );
        if (checkResult.rows.length === 0) {
            return res.json({ success: false, message: "Reservation not found or not yours" });
        }
        await pool.query("DELETE FROM reservations WHERE id = $1", [reservationId]);
        res.json({ success: true, message: "Reservation cancelled" });
    } catch (err) {
        console.log(err);
        res.json({ success: false, message: "Server error" });
    }
});

router.get("/slots", authMiddleware, async (req, res) => {
    try {
        const { date } = req.query;

        if (!date) return res.json({ success: false, message: "Date required" });

        const result = await pool.query(
            "SELECT time FROM reservations WHERE date = $1 AND status = 'confirmed'",
            [date]
        );

        const takenSlots = result.rows.map(r => r.time);

        res.json({ success: true, takenSlots });

    } catch (err) {
        console.log(err);
        res.json({ success: false, message: "Server error" });
    }
});

module.exports = router;
