const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure upload directories exist
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Configure storage for video files
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads/videos");
    ensureDirectoryExists(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `video-${uniqueSuffix}${ext}`);
  },
});

// Configure storage for thumbnail files
const thumbnailStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads/thumbnails");
    ensureDirectoryExists(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `thumbnail-${uniqueSuffix}${ext}`);
  },
});

// File filter for videos
const videoFileFilter = (req, file, cb) => {
  const allowedVideoTypes = [
    "video/mp4",
    "video/mpeg",
    "video/quicktime",
    "video/x-msvideo",
    "video/x-matroska",
    "video/webm",
    "video/ogg",
    "video/3gpp",
    "video/3gpp2",
  ];

  if (allowedVideoTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only video files are allowed: MP4, MPEG, MOV, AVI, MKV, WebM, OGG, 3GP"
      ),
      false
    );
  }
};

// File filter for thumbnails
const thumbnailFileFilter = (req, file, cb) => {
  const allowedImageTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
  ];

  if (allowedImageTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only image files are allowed: JPEG, JPG, PNG, WebP, GIF"
      ),
      false
    );
  }
};

// Create multer instances
const uploadVideo = multer({
  storage: videoStorage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
  },
  fileFilter: videoFileFilter,
});

const uploadThumbnail = multer({
  storage: thumbnailStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: thumbnailFileFilter,
});

// Middleware for video upload with thumbnail
const videoUploadMiddleware = (req, res, next) => {
  // Use multer to handle multiple files
  const upload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        let uploadDir;
        if (file.fieldname === "videoFile") {
          uploadDir = path.join(__dirname, "../uploads/videos");
        } else if (file.fieldname === "thumbnailFile") {
          uploadDir = path.join(__dirname, "../uploads/thumbnails");
        } else {
          uploadDir = path.join(__dirname, "../uploads");
        }
        ensureDirectoryExists(uploadDir);
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        let prefix = "file";
        if (file.fieldname === "videoFile") {
          prefix = "video";
        } else if (file.fieldname === "thumbnailFile") {
          prefix = "thumbnail";
        }
        cb(null, `${prefix}-${uniqueSuffix}${ext}`);
      },
    }),
    limits: {
      fileSize: 500 * 1024 * 1024, // 500MB
    },
    fileFilter: (req, file, cb) => {
      if (file.fieldname === "videoFile") {
        const allowedTypes = [
          "video/mp4",
          "video/mpeg",
          "video/quicktime",
          "video/x-msvideo",
          "video/x-matroska",
          "video/webm",
          "video/ogg",
          "video/3gpp",
          "video/3gpp2",
        ];
        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error("Invalid video file type"), false);
        }
      } else if (file.fieldname === "thumbnailFile") {
        const allowedTypes = [
          "image/jpeg",
          "image/jpg",
          "image/png",
          "image/webp",
          "image/gif",
        ];
        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error("Invalid image file type for thumbnail"), false);
        }
      } else {
        cb(null, true);
      }
    },
  }).fields([
    { name: "videoFile", maxCount: 1 },
    { name: "thumbnailFile", maxCount: 1 },
  ]);

  upload(req, res, (err) => {
    if (err) {
      console.error("Upload error:", err);
      return res.status(400).json({
        message: "File upload error",
        error: err.message,
      });
    }
    next();
  });
};

module.exports = {
  uploadVideo,
  uploadThumbnail,
  videoUploadMiddleware,
};
