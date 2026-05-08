const express = require("express");

const router = express.Router();

const uploadBlog = require("../middleware/uploadBlog");

const {
  getBlogs,
  getBlogBySlug,
  createBlog,
  updateBlog,
  deleteBlog,
} = require("../controllers/blogController");

router.get("/", getBlogs);

router.get("/:slug", getBlogBySlug);

router.post(
  "/",
  uploadBlog.single("coverImage"),
  createBlog
);

router.put(
  "/:id",
  uploadBlog.single("coverImage"),
  updateBlog
);

router.delete("/:id", deleteBlog);

module.exports = router;
