const express = require('express');
const router = express.Router();
const {
  getAllBlogs,
  getBlogBySlug,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog
} = require('../controllers/blogController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/uploadBlog');

// Public routes
router.get('/', getAllBlogs);
router.get('/slug/:slug', getBlogBySlug);
router.get('/:id', getBlogById);

// Admin routes (protected)
router.post('/', protect, upload.single('featuredImage'), createBlog);
router.put('/:id', protect, upload.single('featuredImage'), updateBlog);
router.delete('/:id', protect, deleteBlog);

module.exports = router;
