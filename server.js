const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use("/auth", require("./routes/auth"));
app.use("/reservations", require("./routes/reservations"));
app.use("/rewards", require("./routes/rewards"));
app.use("/profile", require("./routes/profile"));  


app.listen(3000, () => console.log("Server running on port 3000"));
