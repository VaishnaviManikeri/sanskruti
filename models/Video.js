const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    videoUrl: {
      type: String,
      required: [true, "Video URL is required"],
    },
    thumbnailUrl: {
      type: String,
      default: "",
    },
    videoType: {
      type: String,
      enum: ["upload", "url"],
      default: "url",
    },
    videoFile: {
      type: String,
      default: "",
    },
    duration: {
      type: String,
      default: "",
    },
    views: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Add index for better query performance
videoSchema.index({ createdAt: -1 });
videoSchema.index({ isActive: 1 });

module.exports = mongoose.model("Video", videoSchema);
