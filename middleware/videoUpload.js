const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const createUploadDirs = () => {
  const dirs = [
    path.join(__dirname, '../uploads/videos'),
    path.join(__dirname, '../uploads/thumbnails')
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

createUploadDirs();

// Configure storage for video files
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/videos'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `video-${uniqueSuffix}${ext}`);
  }
});

// Configure storage for thumbnail files
const thumbnailStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/thumbnails'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `thumbnail-${uniqueSuffix}${ext}`);
  }
});

// File filter for videos
const videoFileFilter = (req, file, cb) => {
  const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid video format. Please upload MP4, WebM, OGG, MOV, AVI, or MKV files.'), false);
  }
};

// File filter for images (thumbnails)
const imageFileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid image format. Please upload JPEG, PNG, GIF, or WebP files.'), false);
  }
};

// Multer instances with larger limits
const uploadVideo = multer({
  storage: videoStorage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  },
  fileFilter: videoFileFilter
});

const uploadThumbnail = multer({
  storage: thumbnailStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: imageFileFilter
});

// Combined upload middleware for both video and thumbnail
const uploadVideoWithThumbnail = (req, res, next) => {
  const upload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        if (file.fieldname === 'video') {
          cb(null, path.join(__dirname, '../uploads/videos'));
        } else if (file.fieldname === 'thumbnail') {
          cb(null, path.join(__dirname, '../uploads/thumbnails'));
        } else {
          cb(new Error('Unexpected field'), false);
        }
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const prefix = file.fieldname === 'video' ? 'video' : 'thumbnail';
        cb(null, `${prefix}-${uniqueSuffix}${ext}`);
      }
    }),
    limits: {
      fileSize: 100 * 1024 * 1024 // 100MB limit for all files
    },
    fileFilter: (req, file, cb) => {
      if (file.fieldname === 'video') {
        videoFileFilter(req, file, cb);
      } else if (file.fieldname === 'thumbnail') {
        imageFileFilter(req, file, cb);
      } else {
        cb(new Error('Unexpected field'), false);
      }
    }
  }).fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
  ]);

  upload(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      // Handle specific multer errors
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
          error: `File size too large. Maximum size is 100MB.` 
        });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ 
          error: 'Unexpected field. Please use "video" and "thumbnail" fields.' 
        });
      }
      return res.status(400).json({ error: err.message });
    }
    next();
  });
};

module.exports = {
  uploadVideo,
  uploadThumbnail,
  uploadVideoWithThumbnail
};
