const express = require("express");
const cors = require("cors");

const lessonRoutes = require("./routes/lessonRoutes");
const errorHandler = require("./middleware/errorHandler");

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "AI Doubt Solver API is running"
    });
});

app.use("/api/lessons", lessonRoutes);

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found."
    });
});

app.use(errorHandler);

module.exports = app;
