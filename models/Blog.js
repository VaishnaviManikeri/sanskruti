const mongoose = require("mongoose");

const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    author: { type: String, required: true },
    content: { type: String, required: true }, // HTML content from rich text editor
    image: { type: String },
    slug: { type: String, required: true, unique: true }, // SEO-friendly URL
    metaTitle: { type: String },
    metaDescription: { type: String },
    readingTime: { type: Number, default: 5 },
    featured: { type: Boolean, default: false },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

// Auto-generate slug from title before saving
blogSchema.pre('save', function(next) {
  if (this.isModified('title') && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

module.exports = mongoose.model("Blog", blogSchema);
