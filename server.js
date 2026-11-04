
// ============================================
// BLOOD CONNECT - SERVER.JS
// ============================================

// Import required packages
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");

// Load environment variables
dotenv.config();

// Create Express application
const app = express();

// ============================================
// MIDDLEWARE
// ============================================

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

// Serve frontend files from public folder
app.use(express.static(path.join(__dirname, "public")));

// ============================================
// HEALTH CHECK API
// ============================================

app.get("/api/status", (req, res) => {

    res.status(200).json({
        success: true,
        message: "Blood Connect API is running",
        database:
            mongoose.connection.readyState === 1
                ? "Connected"
                : "Disconnected"
    });

});

// ============================================
// API ROUTES
// ============================================

// Authentication routes
app.use("/api/auth", require("./routes/auth"));

// Donor routes
app.use("/api/donors", require("./routes/donor"));

// Blood request routes
app.use("/api/requests", require("./routes/requests"));

// ============================================
// FRONTEND ROUTE
// ============================================

app.get("/", (req, res) => {

    res.sendFile(
        path.join(__dirname, "public", "index.html")
    );

});

// ============================================
// 404 API HANDLER
// ============================================

app.use("/api", (req, res) => {

    res.status(404).json({
        success: false,
        message: "API endpoint not found"
    });

});

// ============================================
// GENERAL ERROR HANDLER
// ============================================

app.use((err, req, res, next) => {

    console.error("Server Error:", err);

    res.status(err.status || 500).json({
        success: false,
        message: "Internal server error"
    });

});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 5000;

// Start HTTP server
const server = app.listen(PORT, "0.0.0.0", () => {

    console.log("----------------------------------");
    console.log("BLOOD CONNECT SERVER STARTED");
    console.log("----------------------------------");

    console.log(`Server running on port ${PORT}`);

    console.log("Frontend: Available");

    console.log("API: /api/status");

    console.log("----------------------------------");

});

// ============================================
// MONGODB CONNECTION
// ============================================

async function connectDatabase() {

    try {

        if (!process.env.MONGO_URI) {

            console.error(
                "MongoDB Error: MONGO_URI is not configured"
            );

            return;
        }

        await mongoose.connect(process.env.MONGO_URI);

        console.log("MongoDB Connected Successfully");

    } catch (error) {

        console.error(
            "MongoDB Connection Error:",
            error.message
        );

        console.log(
            "The website server is running, but database features require a working MongoDB connection."
        );

    }

}

// Connect to database
connectDatabase();

// ============================================
// SERVER ERROR HANDLING
// ============================================

server.on("error", (error) => {

    console.error("HTTP Server Error:", error.message);

});

process.on("unhandledRejection", (reason) => {

    console.error("Unhandled Promise Rejection:", reason);

});

// ============================================
// END OF SERVER.JS
// ============================================
