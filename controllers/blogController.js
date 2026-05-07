const Blog = require('../models/Blog');
const fs = require('fs');
const path = require('path');

// @desc    Get all blogs
// @route   GET /api/blogs
// @access  Public
const getBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find({ status: 'published' })
      .sort({ publishedAt: -1 })
      .select('-content');
    
    res.status(200).json({
      success: true,
      data: blogs,
    });
  } catch (error) {
    console.error('Error fetching blogs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch blogs',
    });
  }
};

// @desc    Get single blog by ID
// @route   GET /api/blogs/:id
// @access  Public
const getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found',
      });
    }
    
    // Increment view count
    blog.views += 1;
    await blog.save();
    
    res.status(200).json({
      success: true,
      data: blog,
    });
  } catch (error) {
    console.error('Error fetching blog:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch blog',
    });
  }
};

// @desc    Get single blog by slug
// @route   GET /api/blogs/slug/:slug
// @access  Public
const getBlogBySlug = async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug, status: 'published' });
    
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found',
      });
    }
    
    // Increment view count
    blog.views += 1;
    await blog.save();
    
    res.status(200).json({
      success: true,
      data: blog,
    });
  } catch (error) {
    console.error('Error fetching blog:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch blog',
    });
  }
};

// @desc    Create a blog
// @route   POST /api/blogs
// @access  Private
const createBlog = async (req, res) => {
  try {
    const { title, author, content, excerpt, featuredImage, metaTitle, metaDescription, tags, readingTime } = req.body;
    
    // Calculate reading time if not provided
    let finalReadingTime = readingTime;
    if (!finalReadingTime && content) {
      const wordsPerMinute = 200;
      const wordCount = content.replace(/<[^>]*>/g, '').split(/\s+/).length;
      finalReadingTime = Math.max(1, Math.ceil(wordCount / wordsPerMinute));
    }
    
    const blog = await Blog.create({
      title,
      author: author || 'Admin',
      content,
      excerpt,
      featuredImage,
      metaTitle: metaTitle || title,
      metaDescription: metaDescription || excerpt,
      tags: tags || [],
      readingTime: finalReadingTime || 5,
    });
    
    res.status(201).json({
      success: true,
      data: blog,
    });
  } catch (error) {
    console.error('Error creating blog:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A blog with this title already exists',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to create blog',
    });
  }
};

// @desc    Update a blog
// @route   PUT /api/blogs/:id
// @access  Private
const updateBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found',
      });
    }
    
    const { title, author, content, excerpt, featuredImage, metaTitle, metaDescription, tags, readingTime, status } = req.body;
    
    // Calculate reading time if content changed
    let finalReadingTime = readingTime;
    if (!finalReadingTime && content) {
      const wordsPerMinute = 200;
      const wordCount = content.replace(/<[^>]*>/g, '').split(/\s+/).length;
      finalReadingTime = Math.max(1, Math.ceil(wordCount / wordsPerMinute));
    }
    
    const updatedBlog = await Blog.findByIdAndUpdate(
      req.params.id,
      {
        title: title || blog.title,
        author: author || blog.author,
        content: content || blog.content,
        excerpt: excerpt || blog.excerpt,
        featuredImage: featuredImage || blog.featuredImage,
        metaTitle: metaTitle || blog.metaTitle,
        metaDescription: metaDescription || blog.metaDescription,
        tags: tags || blog.tags,
        readingTime: finalReadingTime || blog.readingTime,
        status: status || blog.status,
      },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      data: updatedBlog,
    });
  } catch (error) {
    console.error('Error updating blog:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update blog',
    });
  }
};

// @desc    Delete a blog
// @route   DELETE /api/blogs/:id
// @access  Private
const deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found',
      });
    }
    
    await blog.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Blog deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting blog:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete blog',
    });
  }
};

// @desc    Upload blog image
// @route   POST /api/blogs/upload-image
// @access  Private
const uploadImage = async (req, res) => {
  try {
    console.log('Upload image request received');
    console.log('Request file:', req.file);
    
    if (!req.file) {
      console.log('No file in request');
      return res.status(400).json({
        success: false,
        message: 'No image file provided. Please select an image file.',
      });
    }
    
    // Get the uploaded file URL
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    const imageUrl = `/uploads/${req.file.filename}`;
    
    console.log('Image uploaded successfully:', imageUrl);
    
    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      url: imageUrl,
      data: {
        url: imageUrl,
        filename: req.file.filename,
        size: req.file.size,
      },
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload image: ' + error.message,
    });
  }
};

module.exports = {
  getBlogs,
  getBlogById,
  getBlogBySlug,
  createBlog,
  updateBlog,
  deleteBlog,
  uploadImage,
};
