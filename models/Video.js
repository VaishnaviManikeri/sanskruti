// backend/models/Video.js
const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    videoUrl: {
      type: String,
      required: true,
    },
    thumbnail: {
      type: String,
      default: '',
    },
    videoType: {
      type: String,
      enum: ['upload', 'url'],
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    uploadedBy: {
      type: String,
      default: 'Admin',
    },
  },
  {
    timestamps: true,
  }
);

// Generate thumbnail from YouTube URL or Vimeo URL
videoSchema.methods.generateThumbnail = function() {
  if (!this.videoUrl) return null;
  
  // YouTube thumbnail
  const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const youtubeMatch = this.videoUrl.match(youtubeRegex);
  
  if (youtubeMatch) {
    return `https://img.youtube.com/vi/${youtubeMatch[1]}/maxresdefault.jpg`;
  }
  
  // Vimeo thumbnail (requires API call, we'll handle in controller)
  // For other URLs, return default thumbnail
  return null;
};

module.exports = mongoose.model('Video', videoSchema);
