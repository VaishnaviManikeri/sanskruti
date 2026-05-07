// backend/routes/blogs.js
const express = require("express");
const Blog = require("../models/Blog");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const router = express.Router();

/* ================= MULTER CONFIG ================= */
const uploadDir = path.join(__dirname, "..", "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({ storage });

// Helper function to generate slug
const generateSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
};

/* ================= GET ALL BLOGS ================= */
router.get("/", async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.json(blogs);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch blogs" });
  }
});

/* ================= GET SINGLE BLOG BY ID ================= */
router.get("/:id", async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: "Blog not found" });
    res.json(blog);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch blog" });
  }
});

/* ================= GET SINGLE BLOG BY SLUG ================= */
router.get("/slug/:slug", async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug });
    if (!blog) return res.status(404).json({ message: "Blog not found" });
    res.json(blog);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch blog" });
  }
});

/* ================= CREATE BLOG ================= */
router.post("/", upload.single("image"), async (req, res) => {
  try {
    let slug = generateSlug(req.body.title);
    
    // Check if slug exists and make it unique
    let existingBlog = await Blog.findOne({ slug });
    let counter = 1;
    while (existingBlog) {
      slug = `${generateSlug(req.body.title)}-${counter}`;
      existingBlog = await Blog.findOne({ slug });
      counter++;
    }

    const blog = await Blog.create({
      title: req.body.title,
      author: req.body.author,
      content: req.body.content,
      excerpt: req.body.excerpt || req.body.content.substring(0, 160),
      image: req.file ? `/uploads/${req.file.filename}` : null,
      slug: slug,
      readingTime: Math.ceil(req.body.content.split(' ').length / 200),
      metaTitle: req.body.metaTitle || req.body.title,
      metaDescription: req.body.metaDescription || req.body.content.substring(0, 160),
    });

    res.status(201).json(blog);
  } catch (err) {
    res.status(500).json({
      message: "Blog creation failed",
      error: err.message,
    });
  }
});

/* ================= UPDATE BLOG ================= */
router.put("/:id", upload.single("image"), async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: "Blog not found" });

    blog.title = req.body.title || blog.title;
    blog.author = req.body.author || blog.author;
    blog.content = req.body.content || blog.content;
    blog.excerpt = req.body.excerpt || req.body.content?.substring(0, 160);
    blog.readingTime = Math.ceil((req.body.content || blog.content).split(' ').length / 200);
    blog.metaTitle = req.body.metaTitle || blog.title;
    blog.metaDescription = req.body.metaDescription || req.body.content?.substring(0, 160);

    if (req.file) {
      blog.image = `/uploads/${req.file.filename}`;
    }

    await blog.save();
    res.json(blog);
  } catch (err) {
    res.status(500).json({ message: "Blog update failed" });
  }
});

/* ================= DELETE BLOG ================= */
router.delete("/:id", async (req, res) => {
  try {
    await Blog.findByIdAndDelete(req.params.id);
    res.json({ message: "Blog deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Blog delete failed" });
  }
});

module.exports = router;
