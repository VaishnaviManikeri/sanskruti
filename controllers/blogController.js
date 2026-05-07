const Blog = require("../models/Blog");
const slugify = require("slugify");

exports.createBlog = async (req, res) => {
  try {
    const slug = slugify(req.body.title, { lower: true });

    const blog = new Blog({
      ...req.body,
      slug,
      coverImage: req.file
        ? `/uploads/blogs/${req.file.filename}`
        : "",
    });

    await blog.save();

    res.status(201).json(blog);
  } catch (error) {
    res.status(500).json(error.message);
  }
};

exports.getBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });

    res.json(blogs);
  } catch (error) {
    res.status(500).json(error.message);
  }
};

exports.getBlogBySlug = async (req, res) => {
  try {
    const blog = await Blog.findOne({
      slug: req.params.slug,
    });

    res.json(blog);
  } catch (error) {
    res.status(500).json(error.message);
  }
};

exports.updateBlog = async (req, res) => {
  try {
    const slug = slugify(req.body.title, { lower: true });

    const updatedData = {
      ...req.body,
      slug,
    };

    if (req.file) {
      updatedData.coverImage =
        `/uploads/blogs/${req.file.filename}`;
    }

    const blog = await Blog.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { new: true }
    );

    res.json(blog);
  } catch (error) {
    res.status(500).json(error.message);
  }
};

exports.deleteBlog = async (req, res) => {
  try {
    await Blog.findByIdAndDelete(req.params.id);

    res.json({
      message: "Blog Deleted",
    });
  } catch (error) {
    res.status(500).json(error.message);
  }
};
