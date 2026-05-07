const Blog = require('../models/Blog');
const fs = require('fs');
const path = require('path');

// Calculate reading time
const calculateReadingTime = (content) => {
  const wordsPerMinute = 200;
  const text = content.replace(/<[^>]*>/g, '');
  const words = text.trim().split(/\s+/).length;
  const readingTime = Math.ceil(words / wordsPerMinute);
  return readingTime || 1;
};

// Generate excerpt from content
const generateExcerpt = (content, maxLength = 300) => {
  const text = content.replace(/<[^>]*>/g, '');
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

// @desc    Get all blogs
// @route   GET /api/blogs
// @access  Public
const getBlogs = async (req, res) => {
  try {
    const { page = 1, limit = 10, tag } = req.query;
    const query = { status: 'published' };
    
    if (tag) {
      query.tags = tag;
    }
    
    const blogs = await Blog.find(query)
      .sort({ publishedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-content');
    
    const total = await Blog.countDocuments(query);
    
    res.status(200).json({
      success: true,
      blogs,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get single blog by ID
// @route   GET /api/blogs/:id
// @access  Public
const getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }
    
    // Increment views
    blog.views += 1;
    await blog.save();
    
    res.status(200).json({ success: true, blog });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get blog by slug
// @route   GET /api/blogs/slug/:slug
// @access  Public
const getBlogBySlug = async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug });
    
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }
    
    blog.views += 1;
    await blog.save();
    
    res.status(200).json({ success: true, blog });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Create a blog
// @route   POST /api/blogs
// @access  Private
const createBlog = async (req, res) => {
  try {
    const { title, content, author, tags, status, metaTitle, metaDescription, featuredImage } = req.body;
    
    const readingTime = calculateReadingTime(content);
    const excerpt = generateExcerpt(content);
    
    const blog = await Blog.create({
      title,
      content,
      excerpt,
      featuredImage,
      author: author || 'Admin',
      readingTime,
      tags: tags || [],
      status: status || 'published',
      metaTitle: metaTitle || title,
      metaDescription: metaDescription || excerpt,
      publishedAt: status === 'published' ? new Date() : null
    });
    
    res.status(201).json({ success: true, blog });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update a blog
// @route   PUT /api/blogs/:id
// @access  Private
const updateBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }
    
    const { title, content, author, tags, status, metaTitle, metaDescription, featuredImage } = req.body;
    
    let readingTime = blog.readingTime;
    let excerpt = blog.excerpt;
    
    if (content && content !== blog.content) {
      readingTime = calculateReadingTime(content);
      excerpt = generateExcerpt(content);
    }
    
    const updatedBlog = await Blog.findByIdAndUpdate(
      req.params.id,
      {
        title: title || blog.title,
        content: content || blog.content,
        excerpt,
        featuredImage: featuredImage || blog.featuredImage,
        author: author || blog.author,
        readingTime,
        tags: tags || blog.tags,
        status: status || blog.status,
        metaTitle: metaTitle || blog.metaTitle,
        metaDescription: metaDescription || blog.metaDescription,
        publishedAt: status === 'published' && blog.status !== 'published' ? new Date() : blog.publishedAt
      },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({ success: true, blog: updatedBlog });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a blog
// @route   DELETE /api/blogs/:id
// @access  Private
const deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }
    
    // Delete featured image if it exists
    if (blog.featuredImage) {
      const imagePath = path.join(__dirname, '..', blog.featuredImage);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    await blog.deleteOne();
    
    res.status(200).json({ success: true, message: 'Blog deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Upload blog image
// @route   POST /api/blogs/upload-image
// @access  Private
const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    
    const imageUrl = `/uploads/blogs/${req.file.filename}`;
    res.status(200).json({ success: true, url: imageUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

module.exports = {
  getBlogs,
  getBlogById,
  getBlogBySlug,
  createBlog,
  updateBlog,
  deleteBlog,
  uploadImage
};
