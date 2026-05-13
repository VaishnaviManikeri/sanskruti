const Blog = require("../models/Blog");
const slugify = require("slugify");
const { cloudinary } = require("../config/cloudinary");

const calculateReadingTime = (text) => {
  const words = text.replace(/<[^>]+>/g, "").split(/\s+/).length;
  const minutes = Math.ceil(words / 200);
  return `${minutes} min read`;
};

// Get all blogs with filtering, pagination, and search
exports.getBlogs = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      category, 
      tag,
      featured,
      sortBy = 'createdAt',
      order = 'desc'
    } = req.query;

    let query = { published: true };

    // Search functionality
    if (search) {
      query.$text = { $search: search };
    }

    // Category filter
    if (category && category !== 'all') {
      query.category = category;
    }

    // Tag filter
    if (tag) {
      query.tags = tag;
    }

    // Featured filter
    if (featured === 'true') {
      query.featured = true;
    }

    const sortOptions = {};
    sortOptions[sortBy] = order === 'desc' ? -1 : 1;

    const blogs = await Blog.find(query)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Blog.countDocuments(query);

    res.json({
      blogs,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get blog by slug with view count increment
exports.getBlogBySlug = async (req, res) => {
  try {
    // Increment view count
    await Blog.findOneAndUpdate(
      { slug: req.params.slug },
      { $inc: { views: 1 } }
    );

    const blog = await Blog.findOne({ slug: req.params.slug });

    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    // Get related blogs (same category or tags)
    const relatedBlogs = await Blog.find({
      _id: { $ne: blog._id },
      published: true,
      $or: [
        { category: blog.category },
        { tags: { $in: blog.tags } }
      ]
    })
    .limit(3)
    .select('title slug coverImage excerpt readTime');

    res.json({ blog, relatedBlogs });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create new blog
exports.createBlog = async (req, res) => {
  try {
    const {
      title,
      excerpt,
      content,
      author,
      tags,
      category,
      metaTitle,
      metaDescription,
      featured,
    } = req.body;

    // Generate slug
    const slug = slugify(title, { lower: true, strict: true });
    
    // Check if slug exists
    const existing = await Blog.findOne({ slug });
    if (existing) {
      return res.status(400).json({ message: "Blog title already exists" });
    }

    // Parse tags if sent as string
    let parsedTags = [];
    if (tags) {
      parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
    }

    const blogData = {
      title,
      slug,
      excerpt: excerpt || content.substring(0, 160).replace(/<[^>]+>/g, ''),
      content,
      author,
      tags: parsedTags,
      category: category || 'General',
      metaTitle,
      metaDescription,
      readTime: calculateReadingTime(content),
      featured: featured === 'true' || featured === true,
    };

    // Handle image upload to Cloudinary
    if (req.file) {
      blogData.coverImage = {
        url: req.file.path,
        publicId: req.file.filename,
      };
    }

    const blog = new Blog(blogData);
    await blog.save();

    res.status(201).json(blog);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update blog
exports.updateBlog = async (req, res) => {
  try {
    const {
      title,
      excerpt,
      content,
      author,
      tags,
      category,
      metaTitle,
      metaDescription,
      featured,
      published,
    } = req.body;

    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    // Delete old image from Cloudinary if new image is uploaded
    if (req.file && blog.coverImage?.publicId) {
      await cloudinary.uploader.destroy(blog.coverImage.publicId);
    }

    // Parse tags
    let parsedTags = blog.tags;
    if (tags) {
      parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
    }

    blog.title = title;
    blog.slug = slugify(title, { lower: true, strict: true });
    blog.excerpt = excerpt || content.substring(0, 160).replace(/<[^>]+>/g, '');
    blog.content = content;
    blog.author = author;
    blog.tags = parsedTags;
    blog.category = category;
    blog.metaTitle = metaTitle;
    blog.metaDescription = metaDescription;
    blog.readTime = calculateReadingTime(content);
    blog.featured = featured === 'true' || featured === true;
    
    if (published !== undefined) {
      blog.published = published === 'true' || published === true;
    }

    if (req.file) {
      blog.coverImage = {
        url: req.file.path,
        publicId: req.file.filename,
      };
    }

    await blog.save();
    res.json(blog);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete blog
exports.deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    // Delete image from Cloudinary
    if (blog.coverImage?.publicId) {
      await cloudinary.uploader.destroy(blog.coverImage.publicId);
    }

    await blog.deleteOne();
    res.json({ message: "Blog deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get blog statistics
exports.getBlogStats = async (req, res) => {
  try {
    const totalBlogs = await Blog.countDocuments();
    const publishedBlogs = await Blog.countDocuments({ published: true });
    const totalViews = await Blog.aggregate([
      { $group: { _id: null, total: { $sum: "$views" } } }
    ]);
    const categories = await Blog.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } }
    ]);

    res.json({
      totalBlogs,
      publishedBlogs,
      totalViews: totalViews[0]?.total || 0,
      categories,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Like/Unlike blog
exports.toggleLike = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    blog.likes = (blog.likes || 0) + 1;
    await blog.save();

    res.json({ likes: blog.likes });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
