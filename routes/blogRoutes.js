const express = require("express");

const router = express.Router();

const blogController = require("../controllers/blogController");

const upload = require("../middleware/uploadMiddleware");

router.post(
  "/",
  upload.single("coverImage"),
  blogController.createBlog
);

router.get("/", blogController.getBlogs);

router.get("/:slug", blogController.getBlogBySlug);

router.put(
  "/:id",
  upload.single("coverImage"),
  blogController.updateBlog
);

router.delete("/:id", blogController.deleteBlog);

module.exports = router;
