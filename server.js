const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const axios = require("axios");
const fs = require("fs");

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

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("✅ Created uploads directory at:", uploadsDir);
}

// Log the uploads directory path for debugging
console.log("📁 Uploads directory path:", uploadsDir);
console.log("📁 Uploads directory exists:", fs.existsSync(uploadsDir));

// Serve static files from uploads directory
app.use("/uploads", express.static(uploadsDir));

// Also serve from multiple possible locations for backward compatibility
const alternativeUploadsPaths = [
  "/var/www/sanskruti/uploads",
  path.join(process.cwd(), "uploads"),
];

alternativeUploadsPaths.forEach(altPath => {
  if (fs.existsSync(altPath) && altPath !== uploadsDir) {
    console.log("📁 Also serving static files from:", altPath);
    app.use("/uploads", express.static(altPath));
  }
});

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

/* ===================== DEBUG PATHS ROUTE ===================== */

app.get("/debug-paths", (req, res) => {
  const uploadsExists = fs.existsSync(uploadsDir);
  let uploadsContents = [];
  
  if (uploadsExists) {
    try {
      uploadsContents = fs.readdirSync(uploadsDir);
    } catch (err) {
      console.error("Error reading uploads directory:", err);
    }
  }
  
  res.status(200).json({
    __dirname: __dirname,
    cwd: process.cwd(),
    uploadsPath: uploadsDir,
    uploadsExists: uploadsExists,
    uploadsContents: uploadsContents,
    nodeEnv: process.env.NODE_ENV,
    platform: process.platform,
    staticPaths: {
      primary: uploadsDir,
      alternative: alternativeUploadsPaths.filter(p => fs.existsSync(p))
    }
  });
});

/* ===================== HOSTINGER STATUS ===================== */

app.get(
  "/hostinger-status",
  async (req, res) => {
    try {
      const response = await axios.get(
        process.env.HOSTINGER_BACKEND_URL ||
        "https://sanskrutitechnoschool.com"
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
  }
);

/* ===================== DATABASE ===================== */

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
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
app.use("/api/blogs", require("./routes/blog"));
/* ===================== 404 HANDLER ===================== */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

/* ===================== FILE SIZE ERROR ===================== */

app.use((err, req, res, next) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      message: "Image size too large. Maximum size is 10MB",
    });
  }
  next(err);
});

/* ===================== GLOBAL ERROR HANDLER ===================== */

app.use((err, req, res, next) => {
  console.error("❌ Error:", err);

  res.status(500).json({
    success: false,
    message: "Internal Server Error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

/* ===================== SERVER ===================== */

const PORT = process.env.PORT || 5010;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📁 Uploads directory: ${uploadsDir}`);
  console.log(`🔗 Static files served at: /uploads`);
});
