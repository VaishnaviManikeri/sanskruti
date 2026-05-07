const mongoose = require("mongoose");

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
    },

    excerpt: {
      type: String,
      required: true,
    },

    content: {
      type: String,
      required: true,
    },

    author: {
      type: String,
      default: "Admin",
    },

    coverImage: {
      type: String,
    },

    altText: {
      type: String,
      default: "",
    },

    readingTime: {
      type: String,
      default: "5 min read",
    },

    metaTitle: {
      type: String,
    },

    metaDescription: {
      type: String,
    },

    tags: [String],

    published: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Blog", blogSchema);
