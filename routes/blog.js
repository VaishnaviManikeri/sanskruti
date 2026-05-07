const express = require("express");
const router = express.Router();
const {
  getAllBlogs,
  getBlogBySlug,
  createBlog,
  updateBlog,
  deleteBlog,
} = require("../controllers/blogController");
const upload = require("../middleware/upload");

// Public routes
router.get("/", getAllBlogs);
router.get("/:slug", getBlogBySlug);

// Admin routes (add authentication middleware)
router.post("/", upload.single("featuredImage"), createBlog);
router.put("/:id", upload.single("featuredImage"), updateBlog);
router.delete("/:id", deleteBlog);

module.exports = router;
