const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authMiddleware = require('../middleware/auth');
const {
  getBlogs,
  getBlogById,
  getBlogBySlug,
  createBlog,
  updateBlog,
  deleteBlog,
  uploadImage,
} = require('../controllers/blogController');

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log('Created uploads directory:', uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = 'blog-' + uniqueSuffix + ext;
    console.log('Saving file as:', filename);
    cb(null, filename);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  console.log('File filter check:', {
    originalname: file.originalname,
    mimetype: file.mimetype,
    extname: extname,
    mimetype: mimetype
  });
  
  if (mimetype && extname) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter,
});

// ============= PUBLIC ROUTES =============
router.get('/', getBlogs);
router.get('/:id', getBlogById);
router.get('/slug/:slug', getBlogBySlug);

// ============= PROTECTED ROUTES (require authentication) =============
// IMPORTANT: /upload-image route must come BEFORE /:id route to avoid conflict
router.post('/upload-image', authMiddleware, upload.single('image'), uploadImage);

// CRUD operations
router.post('/', authMiddleware, createBlog);
router.put('/:id', authMiddleware, updateBlog);
router.delete('/:id', authMiddleware, deleteBlog);

// Debug route to check if blog routes are working
router.get('/debug/test', (req, res) => {
  res.json({ message: 'Blog routes are working!' });
});

console.log('Blog routes registered');
console.log('  - GET /api/blogs');
console.log('  - GET /api/blogs/:id');
console.log('  - GET /api/blogs/slug/:slug');
console.log('  - POST /api/blogs/upload-image (protected)');
console.log('  - POST /api/blogs (protected)');
console.log('  - PUT /api/blogs/:id (protected)');
console.log('  - DELETE /api/blogs/:id (protected)');

module.exports = router;
