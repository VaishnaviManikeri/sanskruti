const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const axios = require("axios");

dotenv.config();

const app = express();

/* ===================== CORS ===================== */
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "https://sanskrutitechnoschool.com",
      "https://www.sanskrutitechnoschool.com"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    credentials: true,
    optionsSuccessStatus: 200
  })
);

// Handle preflight requests
app.options('*', cors());

/* ===================== BODY PARSER WITH INCREASED LIMIT ===================== */
// Increase limit for JSON and URL-encoded data
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

/* ===================== STATIC FILES ===================== */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ===================== HEALTH CHECK ===================== */
app.get("/", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Backend is running 🚀",
  });
});

app.get("/ping", (req, res) => {
  res.status(200).json({
    message: "pong 🏓",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

/* ===================== DATABASE ===================== */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

/* ===================== ROUTES ===================== */
app.use("/api/auth", require("./routes/auth"));
app.use("/api/gallery", require("./routes/gallery"));
app.use("/api/announcements", require("./routes/announcements"));
app.use("/api/careers", require("./routes/careers"));
app.use("/api/blogs", require("./routes/blog"));

/* ===================== 404 HANDLER ===================== */
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

/* ===================== GLOBAL ERROR HANDLER ===================== */
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.message);
  
  // Handle multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      message: "File too large. Maximum size is 5MB"
    });
  }
  
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      message: "Unexpected field"
    });
  }
  
  res.status(500).json({
    message: "Internal Server Error",
    error: err.message,
  });
});

/* ===================== SERVER ===================== */
const PORT = 5010;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
