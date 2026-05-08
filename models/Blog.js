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
    },

    content: {
      type: String,
      required: true,
    },

    coverImage: {
      type: String,
    },

    author: {
      type: String,
      default: "Admin",
    },

    tags: [String],

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
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Blog", BlogSchema);
