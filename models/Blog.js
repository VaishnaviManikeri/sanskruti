const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  metaTitle: {
    type: String,
    required: true,
    trim: true
  },
  metaDescription: {
    type: String,
    required: true,
    trim: true
  },
  author: {
    name: {
      type: String,
      required: true
    },
    avatar: {
      type: String,
      default: ''
    },
    bio: String
  },
  featuredImage: {
    url: String,
    alt: String,
    caption: String
  },
  content: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  readingTime: {
    type: Number,
    default: 5
  },
  tags: [String],
  publishedAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  isPublished: {
    type: Boolean,
    default: true
  },
  viewCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Pre-save middleware to generate slug from title if not provided
blogSchema.pre('save', function(next) {
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
  this.updatedAt = Date.now();
  next();
});

// Method to calculate reading time
blogSchema.methods.calculateReadingTime = function() {
  const wordsPerMinute = 200;
  const text = JSON.stringify(this.content);
  const words = text.trim().split(/\s+/).length;
  this.readingTime = Math.ceil(words / wordsPerMinute);
  return this.readingTime;
};

module.exports = mongoose.model('Blog', blogSchema);
