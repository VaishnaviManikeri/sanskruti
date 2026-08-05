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

module.exports = mongoose.model('Video', videoSchema);
