// backend/models/Blog.js
const mongoose = require("mongoose");

const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    author: { type: String, required: true },
    content: { type: String, required: true },
    excerpt: { type: String },
    image: { type: String },
    slug: { type: String, unique: true },
    readingTime: { type: Number, default: 3 },
    metaTitle: { type: String },
    metaDescription: { type: String },
    views: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Blog", blogSchema);
