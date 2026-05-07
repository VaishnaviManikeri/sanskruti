const Blog = require("../models/Blog");
const fs = require("fs");
const path = require("path");

// Helper function to generate slug
const generateSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};

// Get all blogs (for admin - includes unpublished)
exports.getAllBlogs = async (req, res) => {
  try {
    // Check if admin (has token) vs public
    const isAdmin = req.headers.authorization;
    let query = {};
    
    if (!isAdmin) {
      query = { published: true };
    }
    
    const blogs = await Blog.find(query)
      .sort({ publishedAt: -1 })
      .select("-content");
      
    res.status(200).json({
      success: true,
      data: blogs
    });
  } catch (error) {
    console.error("Error fetching blogs:", error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Get single blog by slug
exports.getBlogBySlug = async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug });
    if (!blog) {
      return res.status(404).json({ 
        success: false,
        message: "Blog not found" 
      });
    }
    
    // Only show unpublished to admins
    if (!blog.published && !req.headers.authorization) {
      return res.status(404).json({ 
        success: false,
        message: "Blog not found" 
      });
    }
    
    // Increment views
    blog.views += 1;
    await blog.save();
    
    res.status(200).json({
      success: true,
      data: blog
    });
  } catch (error) {
    console.error("Error fetching blog:", error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Create blog
exports.createBlog = async (req, res) => {
  try {
    console.log("=== CREATE BLOG DEBUG ===");
    console.log("File received:", req.file);
    console.log("Body:", req.body);
    
    // Parse blog data from form-data
    let blogData;
    try {
      if (req.body.blogData) {
        blogData = JSON.parse(req.body.blogData);
      } else {
        blogData = req.body;
      }
    } catch (e) {
      console.error("Parse error:", e);
      blogData = req.body;
    }
    
    console.log("Parsed blog data:", blogData);
    
    // Validate required fields
    if (!blogData.title || !blogData.title.trim()) {
      return res.status(400).json({ 
        success: false,
        message: "Title is required" 
      });
    }
    
    if (!blogData.content || blogData.content === '<p><br></p>') {
      return res.status(400).json({ 
        success: false,
        message: "Content is required" 
      });
    }
    
    // Check if slug already exists
    let slug = generateSlug(blogData.title);
    let existingBlog = await Blog.findOne({ slug });
    let counter = 1;
    while (existingBlog) {
      slug = `${generateSlug(blogData.title)}-${counter}`;
      existingBlog = await Blog.findOne({ slug });
      counter++;
    }
    
    // Calculate reading time
    const plainText = blogData.content.replace(/<[^>]*>/g, '');
    const wordCount = plainText.split(/\s+/).filter(word => word.length > 0).length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));
    
    // Handle featured image
    let featuredImage = null;
    if (req.file) {
      featuredImage = `/uploads/${req.file.filename}`;
    } else if (blogData.featuredImage && typeof blogData.featuredImage === 'string') {
      featuredImage = blogData.featuredImage;
    }
    
    if (!featuredImage) {
      return res.status(400).json({ 
        success: false,
        message: "Featured image is required" 
      });
    }
    
    // Create blog
    const blog = new Blog({
      title: blogData.title.trim(),
      author: blogData.author?.trim() || "Admin",
      content: blogData.content,
      metaTitle: blogData.metaTitle?.trim() || blogData.title.trim(),
      metaDescription: blogData.metaDescription?.trim() || blogData.title.substring(0, 160),
      featuredImage: featuredImage,
      readingTime: readingTime,
      published: blogData.published !== undefined ? blogData.published : true,
      publishedAt: blogData.published !== false ? new Date() : null,
      slug: slug,
    });
    
    await blog.save();
    
    console.log("Blog created successfully:", blog._id, "Slug:", blog.slug);
    
    res.status(201).json({
      success: true,
      data: blog,
      message: "Blog created successfully"
    });
  } catch (error) {
    console.error("Error creating blog:", error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Update blog
exports.updateBlog = async (req, res) => {
  try {
    console.log("=== UPDATE BLOG DEBUG ===");
    console.log("File received:", req.file);
    console.log("Body:", req.body);
    
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ 
        success: false,
        message: "Blog not found" 
      });
    }
    
    // Parse blog data
    let blogData;
    try {
      if (req.body.blogData) {
        blogData = JSON.parse(req.body.blogData);
      } else {
        blogData = req.body;
      }
    } catch (e) {
      console.error("Parse error:", e);
      blogData = req.body;
    }
    
    // Calculate reading time if content changed
    let readingTime = blog.readingTime;
    if (blogData.content && blogData.content !== blog.content) {
      const plainText = blogData.content.replace(/<[^>]*>/g, '');
      const wordCount = plainText.split(/\s+/).filter(word => word.length > 0).length;
      readingTime = Math.max(1, Math.ceil(wordCount / 200));
    }
    
    // Handle featured image
    let featuredImage = blog.featuredImage;
    if (req.file) {
      // Delete old image if exists and it's not a default image
      if (blog.featuredImage && blog.featuredImage !== '/uploads/default.jpg') {
        const oldImagePath = path.join(__dirname, "../", blog.featuredImage);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      featuredImage = `/uploads/${req.file.filename}`;
    }
    
    // Update slug if title changed
    let slug = blog.slug;
    if (blogData.title && blogData.title !== blog.title) {
      slug = generateSlug(blogData.title);
      let existingBlog = await Blog.findOne({ slug, _id: { $ne: blog._id } });
      let counter = 1;
      while (existingBlog) {
        slug = `${generateSlug(blogData.title)}-${counter}`;
        existingBlog = await Blog.findOne({ slug, _id: { $ne: blog._id } });
        counter++;
      }
    }
    
    // Update blog fields
    blog.title = blogData.title?.trim() || blog.title;
    blog.slug = slug;
    blog.author = blogData.author?.trim() || blog.author;
    blog.content = blogData.content || blog.content;
    blog.metaTitle = blogData.metaTitle?.trim() || blog.metaTitle;
    blog.metaDescription = blogData.metaDescription?.trim() || blog.metaDescription;
    blog.featuredImage = featuredImage;
    blog.readingTime = readingTime;
    blog.published = blogData.published !== undefined ? blogData.published : blog.published;
    
    // Update publishedAt if being published now
    if (blogData.published === true && !blog.published) {
      blog.publishedAt = new Date();
    }
    
    await blog.save();
    
    res.status(200).json({
      success: true,
      data: blog,
      message: "Blog updated successfully"
    });
  } catch (error) {
    console.error("Error updating blog:", error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Delete blog
exports.deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ 
        success: false,
        message: "Blog not found" 
      });
    }
    
    // Delete featured image
    if (blog.featuredImage && blog.featuredImage !== '/uploads/default.jpg') {
      const imagePath = path.join(__dirname, "../", blog.featuredImage);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    await blog.deleteOne();
    
    res.status(200).json({ 
      success: true,
      message: "Blog deleted successfully" 
    });
  } catch (error) {
    console.error("Error deleting blog:", error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};
