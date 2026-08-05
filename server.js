const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const axios = require("axios");

dotenv.config();

const app = express();

/* =========================================================
   CORS CONFIGURATION
========================================================= */
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://sanskrutitechnoschool.com",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

/* =========================================================
   BODY PARSER
========================================================= */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================================================
   STATIC FILES
========================================================= */
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);

/* =========================================================
   HEALTH CHECK ROUTE
========================================================= */
app.get("/", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Backend is running 🚀",
  });
});

/* =========================================================
   PING ROUTE
========================================================= */
app.get("/ping", (req, res) => {
  res.status(200).json({
    message: "pong 🏓",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

/* =========================================================
   HOSTINGER BACKEND STATUS CHECK
========================================================= */
app.get("/hostinger-status", async (req, res) => {
  try {
    const response = await axios.get(
      process.env.HOSTINGER_BACKEND_URL ||
        "https://your-hostinger-backend.com"
    );

    res.status(200).json({
      status: "Hostinger backend reachable ✅",
      data: response.data,
    });
  } catch (error) {
    res.status(500).json({
      status: "Hostinger backend unreachable ❌",
      error: error.message,
    });
  }
});

/* =========================================================
   DATABASE CONNECTION
========================================================= */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
  })
  .catch((err) => {
    console.error(
      "❌ MongoDB connection error:",
      err.message
    );
    process.exit(1);
  });

/* =========================================================
   API ROUTES
========================================================= */

// AUTH ROUTES
app.use("/api/auth", require("./routes/auth"));

// GALLERY ROUTES
app.use("/api/gallery", require("./routes/gallery"));

// ANNOUNCEMENT ROUTES
app.use(
  "/api/announcements",
  require("./routes/announcements")
);

// CAREER ROUTES
app.use("/api/careers", require("./routes/careers"));

/* =========================================================
   BLOG ROUTES
========================================================= */
// BLOG ROUTES
app.use("/api/blogs", require("./routes/blogs"));

/* =========================================================
   VIDEO ROUTES
========================================================= */
// VIDEO ROUTES
app.use("/api/videos", require("./routes/videos"));

/* =========================================================
   404 ROUTE HANDLER
========================================================= */
app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

/* =========================================================
   GLOBAL ERROR HANDLER
========================================================= */
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.message);

  res.status(500).json({
    message: "Internal Server Error",
    error: err.message,
  });
});

/* =========================================================
   SERVER
========================================================= */
const PORT = process.env.PORT || 5010;

app.listen(PORT, () => {
  console.log(
    `🚀 Server running on port ${PORT}`
  );
});
