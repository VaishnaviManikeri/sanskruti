const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Blog = require('../models/Blog');

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = 'uploads/blogs';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

// Middleware to verify admin token (simple version)
const verifyAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  // For demo purposes, using simple token check
  // In production, use proper JWT verification
  if (!token || token !== 'admin_demo_token_2024') {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
};

// GET all blogs (public)
router.get('/', async (req, res) => {
  try {
    const blogs = await Blog.find({ published: true })
      .sort({ publishedAt: -1 })
      .select('-content');
    res.json(blogs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET single blog by slug (public)
router.get('/:slug', async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug, published: true });
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }
    // Increment views
    blog.views += 1;
    await blog.save();
    res.json(blog);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET all blogs for admin (with unpublished)
router.get('/admin/all', verifyAdmin, async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.json(blogs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET single blog by ID for admin
router.get('/admin/:id', verifyAdmin, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }
    res.json(blog);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// CREATE blog (admin)
router.post('/', verifyAdmin, upload.single('featuredImage'), async (req, res) => {
  try {
    const blogData = JSON.parse(req.body.data);
    
    // Calculate reading time (approx 200 words per minute)
    const wordCount = blogData.content.split(/\s+/).length;
    const readingTime = Math.max(3, Math.ceil(wordCount / 200));
    
    const blog = new Blog({
      ...blogData,
      readingTime,
      featuredImage: req.file ? `/uploads/blogs/${req.file.filename}` : blogData.featuredImage
    });
    
    const savedBlog = await blog.save();
    res.status(201).json(savedBlog);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// UPDATE blog (admin)
router.put('/:id', verifyAdmin, upload.single('featuredImage'), async (req, res) => {
  try {
    const blogData = JSON.parse(req.body.data);
    
    if (req.file) {
      blogData.featuredImage = `/uploads/blogs/${req.file.filename}`;
    }
    
    // Recalculate reading time if content changed
    if (blogData.content) {
      const wordCount = blogData.content.split(/\s+/).length;
      blogData.readingTime = Math.max(3, Math.ceil(wordCount / 200));
    }
    
    const updatedBlog = await Blog.findByIdAndUpdate(
      req.params.id,
      blogData,
      { new: true, runValidators: true }
    );
    
    if (!updatedBlog) {
      return res.status(404).json({ message: 'Blog not found' });
    }
    
    res.json(updatedBlog);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE blog (admin)
router.delete('/:id', verifyAdmin, async (req, res) => {
  try {
    const blog = await Blog.findByIdAndDelete(req.params.id);
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }
    res.json({ message: 'Blog deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
