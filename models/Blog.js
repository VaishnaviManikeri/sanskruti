const mongoose = require("mongoose");

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    content: {
      type: String,
      required: [true, "Content is required"],
    },
    author: {
      type: String,
      required: [true, "Author name is required"],
      default: "Admin",
    },
    featuredImage: {
      type: String,
      required: [true, "Featured image is required"],
    },
    metaTitle: {
      type: String,
      required: [true, "Meta title is required"],
    },
    metaDescription: {
      type: String,
      required: [true, "Meta description is required"],
    },
    readingTime: {
      type: Number,
      default: 5,
    },
    views: {
      type: Number,
      default: 0,
    },
    published: {
      type: Boolean,
      default: true,
    },
    publishedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Create slug from title before saving
blogSchema.pre("save", function (next) {
  if (this.isModified("title")) {
    // Create base slug
    let baseSlug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    
    // Add timestamp to ensure uniqueness
    this.slug = `${baseSlug}-${Date.now()}`;
  }
  next();
});

module.exports = mongoose.model("Blog", blogSchema);
