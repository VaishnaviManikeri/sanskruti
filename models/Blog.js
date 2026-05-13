const mongoose = require("mongoose");

const BlogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    excerpt: {
      type: String,
      required: true,
      maxlength: 200,
    },
    content: {
      type: String,
      required: true,
    },
    coverImage: {
      url: String,
      publicId: String,
    },
    author: {
      type: String,
      default: "Admin",
    },
    tags: [{
      type: String,
      trim: true,
    }],
    category: {
      type: String,
      enum: ['Education', 'News', 'Events', 'Announcements', 'General'],
      default: 'General'
    },
    metaTitle: String,
    metaDescription: String,
    readTime: {
      type: String,
      default: "5 min read",
    },
    published: {
      type: Boolean,
      default: true,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    views: {
      type: Number,
      default: 0,
    },
    likes: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Add index for better search performance
BlogSchema.index({ title: 'text', content: 'text', tags: 'text' });

module.exports = mongoose.model("Blog", BlogSchema);
