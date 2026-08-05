// backend/middleware/videoUpload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const videoUploadDir = path.join(__dirname, '../uploads/videos');
const thumbnailUploadDir = path.join(__dirname, '../uploads/thumbnails');

if (!fs.existsSync(videoUploadDir)) {
  fs.mkdirSync(videoUploadDir, { recursive: true });
}

if (!fs.existsSync(thumbnailUploadDir)) {
  fs.mkdirSync(thumbnailUploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'video') {
      cb(null, videoUploadDir);
    } else if (file.fieldname === 'thumbnail') {
      cb(null, thumbnailUploadDir);
    } else {
      cb(new Error('Invalid field name'), null);
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'video') {
    // Accept video files
    const allowedVideoTypes = [
      'video/mp4',
      'video/mpeg',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-matroska',
      'video/webm',
      'video/ogg',
    ];
    if (allowedVideoTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid video file type. Please upload a valid video file.'), false);
    }
  } else if (file.fieldname === 'thumbnail') {
    // Accept image files for thumbnail
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedImageTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid thumbnail file type. Please upload a valid image file.'), false);
    }
  } else {
    cb(new Error('Invalid field'), false);
  }
};

// Create multer instance
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: fileFilter,
});

module.exports = upload;
