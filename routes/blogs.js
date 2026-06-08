const express = require("express");
const router = express.Router();
const uploadBlog = require("../middleware/uploadBlog");
const authMiddleware = require("../middleware/auth");
const {
  getBlogs,
  getBlogBySlug,
  createBlog,
  updateBlog,
  deleteBlog,
  getBlogStats,
  toggleLike,
  getAllBlogsAdmin,
} = require("../controllers/blogController");

// Public routes
router.get("/", getBlogs);
router.get("/stats", getBlogStats);
router.get("/:slug", getBlogBySlug);
router.post("/:id/like", toggleLike);

// Admin routes (protected)
router.use(authMiddleware);
router.get("/admin/all", getAllBlogsAdmin);
router.post("/", uploadBlog.single("coverImage"), createBlog);
router.put("/:id", uploadBlog.single("coverImage"), updateBlog);
router.delete("/:id", deleteBlog);

module.exports = router;
