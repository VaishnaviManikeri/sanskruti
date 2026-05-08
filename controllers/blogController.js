const Blog = require("../models/Blog");
const slugify = require("slugify");

const calculateReadingTime = (text) => {
  const words = text.replace(/<[^>]+>/g, "").split(/\s+/).length;

  const minutes = Math.ceil(words / 200);

  return `${minutes} min read`;
};

exports.getBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find().sort({
      createdAt: -1,
    });

    res.json(blogs);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.getBlogBySlug = async (req, res) => {
  try {
    const blog = await Blog.findOne({
      slug: req.params.slug,
    });

    if (!blog) {
      return res.status(404).json({
        message: "Blog not found",
      });
    }

    res.json(blog);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.createBlog = async (req, res) => {
  try {
    const {
      title,
      excerpt,
      content,
      author,
      metaTitle,
      metaDescription,
    } = req.body;

    const slug = slugify(title, {
      lower: true,
      strict: true,
    });

    const existing = await Blog.findOne({ slug });

    if (existing) {
      return res.status(400).json({
        message: "Blog title already exists",
      });
    }

    const blog = new Blog({
      title,
      slug,
      excerpt,
      content,
      author,
      metaTitle,
      metaDescription,
      readTime: calculateReadingTime(content),
      coverImage: req.file
        ? `/uploads/blogs/${req.file.filename}`
        : "",
    });

    await blog.save();

    res.status(201).json(blog);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.updateBlog = async (req, res) => {
  try {
    const {
      title,
      excerpt,
      content,
      author,
      metaTitle,
      metaDescription,
    } = req.body;

    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({
        message: "Blog not found",
      });
    }

    blog.title = title;
    blog.slug = slugify(title, {
      lower: true,
      strict: true,
    });

    blog.excerpt = excerpt;
    blog.content = content;
    blog.author = author;
    blog.metaTitle = metaTitle;
    blog.metaDescription = metaDescription;
    blog.readTime = calculateReadingTime(content);

    if (req.file) {
      blog.coverImage = `/uploads/blogs/${req.file.filename}`;
    }

    await blog.save();

    res.json(blog);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findByIdAndDelete(
      req.params.id
    );

    if (!blog) {
      return res.status(404).json({
        message: "Blog not found",
      });
    }

    res.json({
      message: "Blog deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
