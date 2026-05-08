const Blog = require('../models/Blog');
const path = require('path');
const fs = require('fs');

// @desc    Get all blogs
// @route   GET /api/blogs
// @access  Public
exports.getAllBlogs = async (req, res) => {
  try {
    const { page = 1, limit = 10, status = 'published' } = req.query;
    
    const query = { status };
    
    const blogs = await Blog.find(query)
      .sort({ publishedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Blog.countDocuments(query);
    
    res.json({
      success: true,
      data: blogs,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get blog by slug
// @route   GET /api/blogs/slug/:slug
// @access  Public
exports.getBlogBySlug = async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug, status: 'published' });
    
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }
    
    // Increment views
    blog.views += 1;
    await blog.save();
    
    res.json({
      success: true,
      data: blog
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get blog by ID
// @route   GET /api/blogs/:id
// @access  Public
exports.getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }
    
    res.json({
      success: true,
      data: blog
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Create a blog
// @route   POST /api/blogs
// @access  Private
exports.createBlog = async (req, res) => {
  try {
    const { title, content, excerpt, author, readingTime, metaTitle, metaDescription, tags, status } = req.body;
    
    // Handle featured image
    let featuredImage = '';
    if (req.file) {
      featuredImage = `/uploads/blogs/${req.file.filename}`;
    } else {
      return res.status(400).json({ message: 'Featured image is required' });
    }
    
    // Calculate reading time if not provided
    let calculatedReadingTime = readingTime;
    if (!calculatedReadingTime && content) {
      const wordsPerMinute = 200;
      const wordCount = content.replace(/<[^>]*>/g, '').split(/\s+/).length;
      calculatedReadingTime = Math.max(1, Math.ceil(wordCount / wordsPerMinute));
    }
    
    const blog = await Blog.create({
      title,
      content,
      excerpt,
      featuredImage,
      author: author || 'Admin',
      readingTime: calculatedReadingTime || 5,
      metaTitle: metaTitle || title,
      metaDescription: metaDescription || excerpt,
      tags: tags ? JSON.parse(tags) : [],
      status: status || 'published'
    });
    
    res.status(201).json({
      success: true,
      data: blog
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update a blog
// @route   PUT /api/blogs/:id
// @access  Private
exports.updateBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }
    
    const { title, content, excerpt, author, readingTime, metaTitle, metaDescription, tags, status } = req.body;
    
    // Handle featured image update
    let featuredImage = blog.featuredImage;
    if (req.file) {
      // Delete old image if exists
      if (blog.featuredImage) {
        const oldImagePath = path.join(__dirname, '..', blog.featuredImage);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      featuredImage = `/uploads/blogs/${req.file.filename}`;
    }
    
    // Calculate reading time if not provided
    let calculatedReadingTime = readingTime;
    if (!calculatedReadingTime && content) {
      const wordsPerMinute = 200;
      const wordCount = content.replace(/<[^>]*>/g, '').split(/\s+/).length;
      calculatedReadingTime = Math.max(1, Math.ceil(wordCount / wordsPerMinute));
    }
    
    const updatedBlog = await Blog.findByIdAndUpdate(
      req.params.id,
      {
        title,
        content,
        excerpt,
        featuredImage,
        author,
        readingTime: calculatedReadingTime,
        metaTitle,
        metaDescription,
        tags: tags ? JSON.parse(tags) : [],
        status
      },
      { new: true, runValidators: true }
    );
    
    res.json({
      success: true,
      data: updatedBlog
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete a blog
// @route   DELETE /api/blogs/:id
// @access  Private
exports.deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }
    
    // Delete featured image
    if (blog.featuredImage) {
      const imagePath = path.join(__dirname, '..', blog.featuredImage);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    await blog.deleteOne();
    
    res.json({
      success: true,
      message: 'Blog deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
