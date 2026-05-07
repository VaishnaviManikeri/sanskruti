const Blog = require("../models/Blog");
const fs = require("fs");
const path = require("path");

// Get all blogs
exports.getAllBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find({ published: true })
      .sort({ publishedAt: -1 })
      .select("-content");
    res.status(200).json(blogs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single blog by slug
exports.getBlogBySlug = async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug });
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }
    // Increment views
    blog.views += 1;
    await blog.save();
    res.status(200).json(blog);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create blog
exports.createBlog = async (req, res) => {
  try {
    const blogData = JSON.parse(req.body.blogData);
    
    // Calculate reading time (approx 200 words per minute)
    const wordCount = blogData.content.replace(/<[^>]*>/g, '').split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 200);
    
    const blog = new Blog({
      ...blogData,
      readingTime,
      featuredImage: req.file ? `/uploads/${req.file.filename}` : blogData.featuredImage,
    });
    
    await blog.save();
    res.status(201).json(blog);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update blog
exports.updateBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }
    
    const blogData = JSON.parse(req.body.blogData);
    
    // Calculate reading time
    const wordCount = blogData.content.replace(/<[^>]*>/g, '').split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 200);
    
    // Delete old image if new one is uploaded
    if (req.file && blog.featuredImage) {
      const oldImagePath = path.join(__dirname, "../", blog.featuredImage);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }
    
    Object.assign(blog, {
      ...blogData,
      readingTime,
      featuredImage: req.file ? `/uploads/${req.file.filename}` : blogData.featuredImage,
    });
    
    await blog.save();
    res.status(200).json(blog);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete blog
exports.deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }
    
    // Delete featured image
    if (blog.featuredImage) {
      const imagePath = path.join(__dirname, "../", blog.featuredImage);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    await blog.deleteOne();
    res.status(200).json({ message: "Blog deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
