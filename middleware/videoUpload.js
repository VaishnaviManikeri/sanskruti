const multer = require("multer");
const path = require("path");
const fs = require("fs");

/* =========================================================
   ENSURE UPLOAD DIRECTORIES EXIST
========================================================= */
const videosDir = path.join(__dirname, "..", "uploads", "videos");
const thumbsDir = path.join(__dirname, "..", "uploads", "thumbnails");

[videosDir, thumbsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

/* =========================================================
   STORAGE CONFIG
   - field "video"     -> uploads/videos
   - field "thumbnail" -> uploads/thumbnails
========================================================= */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "video") {
      cb(null, videosDir);
    } else if (file.fieldname === "thumbnail") {
      cb(null, thumbsDir);
    } else {
      cb(new Error("Unexpected field"), null);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

/* =========================================================
   FILE FILTER
========================================================= */
const fileFilter = (req, file, cb) => {
  if (file.fieldname === "video") {
    if (!file.mimetype.startsWith("video/")) {
      return cb(new Error("Only video files are allowed for the video field"));
    }
  } else if (file.fieldname === "thumbnail") {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed for the thumbnail field"));
    }
  }
  cb(null, true);
};

/* =========================================================
   MULTER INSTANCE
   - video: up to 200MB
   - thumbnail: up to 5MB (enforced loosely by shared limit; fine-grained
     per-field limits aren't supported natively, so we keep a generous cap)
========================================================= */
const videoUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB ceiling (covers thumbnail images too)
  },
});

// Accept an optional video file AND an optional thumbnail image in the same request
module.exports = videoUpload.fields([
  { name: "video", maxCount: 1 },
  { name: "thumbnail", maxCount: 1 },
]);
