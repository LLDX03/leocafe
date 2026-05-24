const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/auth", require("./routes/auth"));
app.use("/reservations", require("./routes/reservations"));
app.use("/rewards", require("./routes/rewards"));

app.listen(3000, () => console.log("Server running on port 3000"));