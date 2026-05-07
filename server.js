const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const axios = require("axios");

dotenv.config();

const app = express();

/* ===================== CORS ===================== */

const corsOptions = {
  origin: [
    "http://localhost:5173",
    "https://sanskrutitechnoschool.com",
    "https://www.sanskrutitechnoschool.com",
  ],

  methods: [
    "GET",
    "POST",
    "PUT",
    "DELETE",
    "OPTIONS",
  ],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
  ],

  credentials: true,
};

app.use(cors(corsOptions));

/* ===================== BODY PARSER ===================== */

app.use(
  express.json({
    limit: "50mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "50mb",
  })
);

/* ===================== STATIC FILES ===================== */

app.use(
  "/uploads",
  express.static(
    path.join(__dirname, "uploads")
  )
);

/* ===================== HEALTH CHECK ===================== */

app.get("/", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Backend is running 🚀",
  });
});

/* ===================== PING ROUTE ===================== */

app.get("/ping", (req, res) => {
  res.status(200).json({
    message: "pong 🏓",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

/* ===================== HOSTINGER STATUS ===================== */

app.get(
  "/hostinger-status",
  async (req, res) => {
    try {
      const response = await axios.get(
        process.env
          .HOSTINGER_BACKEND_URL ||
          "https://sanskrutitechnoschool.com"
      );

      res.status(200).json({
        status:
          "Hostinger backend reachable ✅",

        data: response.data,
      });
    } catch (error) {
      res.status(500).json({
        status:
          "Hostinger backend unreachable ❌",

        error: error.message,
      });
    }
  }
);

/* ===================== DATABASE ===================== */

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

/* ===================== ROUTES ===================== */

app.use(
  "/api/auth",
  require("./routes/auth")
);

app.use(
  "/api/gallery",
  require("./routes/gallery")
);

app.use(
  "/api/announcements",
  require("./routes/announcements")
);

app.use(
  "/api/careers",
  require("./routes/careers")
);

/* BLOG ROUTE */

app.use(
  "/api/blogs",
  require("./routes/blog")
);

/* ===================== 404 HANDLER ===================== */

app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

/* ===================== FILE SIZE ERROR ===================== */

app.use((err, req, res, next) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      message: "Image size too large",
    });
  }

  next(err);
});

/* ===================== GLOBAL ERROR HANDLER ===================== */

app.use((err, req, res, next) => {
  console.error("❌ Error:", err);

  res.status(500).json({
    message: "Internal Server Error",
    error: err.message,
  });
});

/* ===================== SERVER ===================== */

const PORT = process.env.PORT || 5010;

app.listen(PORT, () => {
  console.log(
    `🚀 Server running on port ${PORT}`
  );
});
