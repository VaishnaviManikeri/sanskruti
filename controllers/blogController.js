const Blog = require('../models/Blog');
const fs = require('fs');
const path = require('path');

// Generate slug from title
const generateSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// Calculate reading time (average 200 words per minute)
const calculateReadingTime = (content) => {
  const wordCount = content.replace(/<[^>]*>/g, '').split(/\s+/).length;
  return Math.max(1, Math.ceil(wordCount / 200));
};

// Get all blogs
exports.getAllBlogs = async (req, res) => {
  try {
    const { page = 1, limit = 10, status = 'published' } = req.query;
    const skip = (page - 1) * limit;

    const query = { status: 'published' };
    if (req.query.admin === 'true') {
      delete query.status;
    }

    const blogs = await Blog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Blog.countDocuments(query);

    res.json({
      success: true,
      data: blogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get blog by ID
exports.getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }
    
    // Increment views
    blog.views += 1;
    await blog.save();
    
    res.json({ success: true, data: blog });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get blog by slug
exports.getBlogBySlug = async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug, status: 'published' });
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }
    
    // Increment views
    blog.views += 1;
    await blog.save();
    
    res.json({ success: true, data: blog });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Create blog
exports.createBlog = async (req, res) => {
  try {
    const { title, author, content, metaTitle, metaDescription, tags, status } = req.body;
    
    // Generate slug
    let slug = generateSlug(title);
    let existingBlog = await Blog.findOne({ slug });
    
    // Make slug unique if exists
    if (existingBlog) {
      slug = `${slug}-${Date.now()}`;
    }
    
    // Calculate reading time
    const readingTime = calculateReadingTime(content);
    
    // Handle featured image
    let featuredImage = null;
    if (req.file) {
      featuredImage = `/uploads/blogs/${req.file.filename}`;
    }
    
    const blog = new Blog({
      title,
      slug,
      author: author || 'Admin',
      content,
      featuredImage,
      metaTitle: metaTitle || title,
      metaDescription: metaDescription || content.substring(0, 160).replace(/<[^>]*>/g, ''),
      readingTime,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      status: status || 'published',
    });
    
    await blog.save();
    
    res.status(201).json({ success: true, data: blog });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update blog
exports.updateBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }
    
    const { title, author, content, metaTitle, metaDescription, tags, status } = req.body;
    
    // Update slug if title changed
    let slug = blog.slug;
    if (title && title !== blog.title) {
      slug = generateSlug(title);
      const existingBlog = await Blog.findOne({ slug, _id: { $ne: req.params.id } });
      if (existingBlog) {
        slug = `${slug}-${Date.now()}`;
      }
    }
    
    // Calculate reading time
    const readingTime = calculateReadingTime(content || blog.content);
    
    // Handle featured image
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
    
    // Update blog
    blog.title = title || blog.title;
    blog.slug = slug;
    blog.author = author || blog.author;
    blog.content = content || blog.content;
    blog.featuredImage = featuredImage;
    blog.metaTitle = metaTitle || blog.metaTitle;
    blog.metaDescription = metaDescription || blog.metaDescription;
    blog.readingTime = readingTime;
    blog.tags = tags ? tags.split(',').map(tag => tag.trim()) : blog.tags;
    blog.status = status || blog.status;
    
    await blog.save();
    
    res.json({ success: true, data: blog });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete blog
exports.deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }
    
    // Delete featured image
    if (blog.featuredImage) {
      const imagePath = path.join(__dirname, '..', blog.featuredImage);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    await blog.deleteOne();
    
    res.json({ success: true, message: 'Blog deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
