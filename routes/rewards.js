const express = require("express");
const router = express.Router();
const pool = require("../db/db");
const authMiddleware = require("../middleware/auth");

router.post("/", authMiddleware, async (req, res) => {
    try {
        const { pointsDeducted, rewardName, redemptionId } = req.body;
        if (!pointsDeducted || !rewardName || !redemptionId) {
            return res.json({ success: false, message: "Missing required fields" });
        }
        const userResult = await pool.query(
            "SELECT points FROM users WHERE id = $1",
            [req.user.id]
        );
        if (userResult.rows.length === 0) {
            return res.json({ success: false, message: "User not found" });
        }
        const currentPoints = userResult.rows[0].points;
        if (currentPoints < pointsDeducted) {
            return res.json({ success: false, message: "Not enough points" });
        }
        await pool.query(
            "UPDATE users SET points = points - $1 WHERE id = $2",
            [pointsDeducted, req.user.id]
        );
        await pool.query(
            "INSERT INTO redemptions (user_id, reward_name, points_deducted, redemption_id, created_at) VALUES ($1, $2, $3, $4, NOW())",
            [req.user.id, rewardName, pointsDeducted, redemptionId]
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

module.exports = router;