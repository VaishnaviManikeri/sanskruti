const express = require("express");
const router = express.Router();
const {
  getAllBlogs,
  getBlogBySlug,
  createBlog,
  updateBlog,
  deleteBlog,
} = require("../controllers/blogController");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for image upload with increased limits
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "blog-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only image files are allowed (jpeg, jpg, png, gif, webp)"));
  }
};

const upload = multer({
  storage: storage,
  limits: { 
    fileSize: 10 * 1024 * 1024, // Increase to 10MB limit
    fieldSize: 50 * 1024 * 1024 // Increase field size limit
  },
  fileFilter: fileFilter,
});

// Public routes
router.get("/", getAllBlogs);
router.get("/:slug", getBlogBySlug);

// Admin routes - Add error handling middleware
router.post("/", (req, res, next) => {
  upload.single('featuredImage')(req, res, (err) => {
    if (err) {
      console.error("Multer error:", err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ 
          success: false,
          message: "File too large. Maximum size is 10MB" 
        });
      }
      return res.status(400).json({ 
        success: false,
        message: err.message 
      });
    }
    next();
  });
}, createBlog);

router.put("/:id", (req, res, next) => {
  upload.single('featuredImage')(req, res, (err) => {
    if (err) {
      console.error("Multer error:", err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ 
          success: false,
          message: "File too large. Maximum size is 10MB" 
        });
      }
      return res.status(400).json({ 
        success: false,
        message: err.message 
      });
    }
    next();
  });
}, updateBlog);

router.delete("/:id", deleteBlog);

module.exports = router;
