const express = require("express");
const router = express.Router();
const pool = require("../db/db");
const authMiddleware = require("../middleware/auth");

router.get("/", authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, order_number, items, total, status, pickup_time, created_at
             FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
            [req.user.id]
        );
        const orders = result.rows.map(o => {
            if (o.status === "preparing" && new Date() >= new Date(o.ready_at)) {
                o.status = "ready";
            }
            return o;
        });
        res.json({ success: true, orders });
    } catch (err) {
        console.error(err);
        res.json({ success: false, message: "Server error" });
    }
});

router.post("/", authMiddleware, async (req, res) => {
    const { items, total, pickupTime } = req.body;
    if (!items || !items.length) return res.json({ success: false, message: "No items" });

    try {
        const orderNum = "LC-" + Math.floor(1000 + Math.random() * 9000);
        const readyAt = new Date(Date.now() + 15 * 60 * 1000); // default 15 min

        const result = await pool.query(
            `INSERT INTO orders (user_id, order_number, items, total, status, pickup_time, ready_at)
             VALUES ($1, $2, $3, $4, 'preparing', $5, $6) RETURNING id, order_number`,
            [req.user.id, orderNum, JSON.stringify(items), total, pickupTime, readyAt]
        );

        res.json({ success: true, orderId: result.rows[0].id, orderNumber: result.rows[0].order_number });
    } catch (err) {
        console.error(err);
        res.json({ success: false, message: "Server error" });
    }
});

router.get("/:id", authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, order_number, items, total, status, pickup_time, ready_at, created_at
             FROM orders WHERE id = $1 AND user_id = $2`,
            [req.params.id, req.user.id]
        );

        if (!result.rows.length) return res.json({ success: false, message: "Order not found" });

        const order = result.rows[0];
        // Auto-flip to ready when ready_at has passed
        if (order.status === "preparing" && new Date() >= new Date(order.ready_at)) {
            await pool.query("UPDATE orders SET status = 'ready' WHERE id = $1", [order.id]);
            order.status = "ready";
        }

        res.json({ success: true, order });
    } catch (err) {
        console.error(err);
        res.json({ success: false, message: "Server error" });
    }
});

module.exports = router;
