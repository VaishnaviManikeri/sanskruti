const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

dotenv.config();

const app = express();

/* ===================== CORS ===================== */
const corsOptions = {
  origin: [
    "http://localhost:5173",
    "https://sanskrutitechnoschool.com",
    "https://www.sanskrutitechnoschool.com",
    "https://api.sanskrutitechnoschool.com",
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));

/* ===================== BODY PARSER ===================== */
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

/* ===================== STATIC FILES ===================== */
// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("✅ Created uploads directory at:", uploadsDir);
}

// Serve static files from uploads directory
app.use("/uploads", express.static(uploadsDir));
console.log("📁 Serving static files from:", uploadsDir);

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
  .then(() => {
    console.log("✅ MongoDB connected");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

/* ===================== ROUTES ===================== */
app.use("/api/auth", require("./routes/auth"));
app.use("/api/gallery", require("./routes/gallery"));
app.use("/api/announcements", require("./routes/announcements"));
app.use("/api/careers", require("./routes/careers"));

// BLOG ROUTE - Make sure this line exists
console.log("Registering blog routes at /api/blogs");
app.use("/api/blogs", require("./routes/blog"));

/* ===================== DEBUG ROUTES ===================== */
app.get("/api/debug/routes", (req, res) => {
  const routes = [];
  const extractRoutes = (stack, basePath = '') => {
    stack.forEach(layer => {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
        routes.push(`${methods} ${basePath}${layer.route.path}`);
      } else if (layer.name === 'router' && layer.handle.stack) {
        const routerPath = basePath + (layer.regexp.source.replace('\\/?(?=\\/|$)', '').replace(/\\\//g, '/').replace(/\^/g, '').replace(/\?/g, '').replace(/\(\[\^\\\/\]\+\?\)/g, ':param'));
        extractRoutes(layer.handle.stack, routerPath);
      }
    });
  };
  extractRoutes(app._router.stack);
  res.json({ routes: routes.sort() });
});

/* ===================== 404 HANDLER ===================== */
app.use((req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.url}`);
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.url}`,
  });
});

/* ===================== ERROR HANDLER ===================== */
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
  console.log(`📝 Blog API available at: /api/blogs`);
});
