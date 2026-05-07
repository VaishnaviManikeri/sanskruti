const Blog = require("../models/Blog");
const fs = require("fs");
const path = require("path");

// Get all blogs
exports.getAllBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find({ published: true })
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
      // Check if blogData is in req.body.blogData (stringified JSON)
      if (req.body.blogData) {
        blogData = JSON.parse(req.body.blogData);
      } else {
        // If data is sent directly
        blogData = req.body;
      }
    } catch (e) {
      console.error("Parse error:", e);
      blogData = req.body;
    }
    
    console.log("Parsed blog data:", blogData);
    
    // Validate required fields
    if (!blogData.title) {
      return res.status(400).json({ 
        success: false,
        message: "Title is required" 
      });
    }
    
    if (!blogData.content) {
      return res.status(400).json({ 
        success: false,
        message: "Content is required" 
      });
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
      title: blogData.title,
      author: blogData.author || "Admin",
      content: blogData.content,
      metaTitle: blogData.metaTitle || blogData.title,
      metaDescription: blogData.metaDescription || blogData.title.substring(0, 160),
      featuredImage: featuredImage,
      readingTime: readingTime,
      published: blogData.published !== undefined ? blogData.published : true,
    });
    
    await blog.save();
    
    console.log("Blog created successfully:", blog._id);
    
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
    
    // Calculate reading time
    const plainText = blogData.content.replace(/<[^>]*>/g, '');
    const wordCount = plainText.split(/\s+/).filter(word => word.length > 0).length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));
    
    // Handle featured image
    let featuredImage = blog.featuredImage;
    if (req.file) {
      // Delete old image if exists
      const oldImagePath = path.join(__dirname, "../", blog.featuredImage);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
      featuredImage = `/uploads/${req.file.filename}`;
    }
    
    // Update blog
    blog.title = blogData.title || blog.title;
    blog.author = blogData.author || blog.author;
    blog.content = blogData.content || blog.content;
    blog.metaTitle = blogData.metaTitle || blog.metaTitle;
    blog.metaDescription = blogData.metaDescription || blog.metaDescription;
    blog.featuredImage = featuredImage;
    blog.readingTime = readingTime;
    blog.published = blogData.published !== undefined ? blogData.published : blog.published;
    
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
    if (blog.featuredImage) {
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
