const express = require("express");
const router = express.Router();
const pool = require("../db/db");
const authMiddleware = require("../middleware/auth");

pool.query("UPDATE users SET tier = CASE WHEN total_points >= 5000 THEN 'Gold' WHEN total_points >= 1000 THEN 'Silver' ELSE 'Bronze' END")
  .then(() => console.log('✅ Tiers synced'))
  .catch(err => console.error('Tier sync error:', err));


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


router.get("/", authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT reward_name, points_deducted, created_at 
             FROM redemptions 
             WHERE user_id = $1 
             ORDER BY created_at DESC 
             LIMIT 5`,
            [req.user.id]
        );
        res.json({ success: true, redemptions: result.rows });
    } catch (err) {
        console.log(err);
        res.json({ success: false, message: "Server error" });
    }
});


router.get("/active", authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT reward_name, points_deducted, redemption_id, expires_at
             FROM redemptions
             WHERE user_id = $1
             AND expires_at > NOW()
             ORDER BY created_at DESC`,
            [req.user.id]
        );
        res.json({ success: true, redemptions: result.rows });
    } catch (err) {
        console.log(err);
        res.json({ success: false, message: "Server error" });
    }
});




function getTierDiscount(tier) {
    if (tier === "Gold") return 0.10;
    if (tier === "Silver") return 0.05;
    return 0;
}

function getTierFromPoints(totalPoints) {
    if (totalPoints >= 5000) return "Gold";
    if (totalPoints >= 1000) return "Silver";
    return "Bronze";
}

router.post("/redeem", authMiddleware, async (req, res) => {
    const { baseCost, rewardName, redemptionId } = req.body;

    if (!baseCost || !rewardName || !redemptionId)
        return res.json({ success: false, message: "Missing required fields" });

    try {
        const result = await pool.query(
            "SELECT points, tier FROM users WHERE id = $1",
            [req.user.id]
        );

        if (result.rows.length === 0)
            return res.json({ success: false, message: "User not found" });

        const { points, tier } = result.rows[0];
        const discount = getTierDiscount(tier);
        const finalCost = Math.round(baseCost * (1 - discount));

        if (points < finalCost)
            return res.json({ success: false, message: "Not enough points" });

        // Deduct points
        await pool.query(
            "UPDATE users SET points = points - $1 WHERE id = $2",
            [finalCost, req.user.id]
        );

        await pool.query(
            `INSERT INTO redemptions 
        (user_id, reward_name, points_deducted, redemption_id, expires_at)
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '24 hours')`,
            [req.user.id, rewardName, finalCost, redemptionId]
        );

        res.json({
            success: true,
            finalCost,
            discount: Math.round(discount * 100),
            newPoints: points - finalCost
        });

    } catch (err) {
        console.error(err);
        res.json({ success: false, message: "Server error" });
    }
});

router.post("/earn", authMiddleware, async (req, res) => {
    const { pointsEarned } = req.body;
    if (!pointsEarned) return res.json({ success: false, message: "Missing pointsEarned" });

    try {
        const result = await pool.query(
            `UPDATE users 
            SET points = points + $1,
           total_points = total_points + $1,
           tier = CASE
             WHEN total_points + $1 >= 5000 THEN 'Gold'
             WHEN total_points + $1 >= 1000 THEN 'Silver'
             ELSE 'Bronze'
           END
       WHERE id = $2
       RETURNING points, total_points, tier`,
            [pointsEarned, req.user.id]
        );

        res.json({ success: true, ...result.rows[0] });

    } catch (err) {
        console.error(err);
        res.json({ success: false, message: "Server error" });
    }
});

router.get("/active-qr", authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT redemption_id, reward_name, points_deducted, created_at, expires_at
       FROM redemptions
       WHERE user_id = $1 AND expires_at > NOW() AND used = FALSE
       ORDER BY created_at DESC`,
            [req.user.id]
        );

        res.json({ success: true, codes: result.rows });

    } catch (err) {
        console.error(err);
        res.json({ success: false, message: "Server error" });
    }
});

router.get("/history", authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT reward_name, points_deducted, created_at
       FROM redemptions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
            [req.user.id]
        );

        res.json({ success: true, history: result.rows });

    } catch (err) {
        console.error(err);
        res.json({ success: false, message: "Server error" });
    }
});

module.exports = router;