const express = require('express');
const router = express.Router();
const Blog = require('../models/Blog');

// GET all published blogs for public view
router.get('/blogs', async (req, res) => {
  try {
    const blogs = await Blog.find({ isPublished: true })
      .sort({ publishedAt: -1 })
      .select('title slug featuredImage author readingTime publishedAt metaDescription');
    res.json(blogs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET single blog by slug
router.get('/blogs/:slug', async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug, isPublished: true });
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }
    // Increment view count
    blog.viewCount += 1;
    await blog.save();
    res.json(blog);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ADMIN ROUTES - CRUD Operations

// CREATE blog
router.post('/admin/blogs', async (req, res) => {
  try {
    const blog = new Blog(req.body);
    blog.calculateReadingTime();
    await blog.save();
    res.status(201).json(blog);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// READ all blogs for admin
router.get('/admin/blogs', async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ updatedAt: -1 });
    res.json(blogs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// READ single blog for admin
router.get('/admin/blogs/:id', async (req, res) => {
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

// UPDATE blog
router.put('/admin/blogs/:id', async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }
    
    Object.assign(blog, req.body);
    blog.calculateReadingTime();
    await blog.save();
    res.json(blog);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE blog
router.delete('/admin/blogs/:id', async (req, res) => {
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
