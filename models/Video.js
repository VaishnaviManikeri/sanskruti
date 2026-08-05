const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  videoUrl: {
    type: String,
    required: [true, 'Please add a video URL or upload a video file']
  },
  videoType: {
    type: String,
    enum: ['upload', 'url'],
    required: true
  },
  thumbnail: {
    type: String,
    default: ''
  },
  videoFile: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  views: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Video', videoSchema);
