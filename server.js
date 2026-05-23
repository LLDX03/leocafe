const express = require("express");
const cors = require("cors");
const pool = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

/* ── TEST ROUTE ── */
app.get("/", (req, res) => {
    res.send("Server is running");
});

/* ── REGISTER API (PUT IT HERE) ── */
app.post("/register", async (req, res) => {
    const { username, email, password } = req.body;

    try {
        await pool.query(
            "INSERT INTO users (username, email, password) VALUES ($1, $2, $3)",
            [username, email, password]
        );

        res.json({ success: true });

    } catch (err) {
        console.log(err);

        res.json({
            success: false,
            message: "Error saving user"
        });
    }
});

/* ── START SERVER ── */
app.listen(3000, () => {
    console.log("Server running on port 3000");
});