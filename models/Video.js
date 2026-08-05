const mongoose = require("mongoose");

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
      default: "",
    },

    // "upload"  -> file was uploaded to our server (/uploads/videos/xxx.mp4)
    // "url"     -> external link (YouTube, Vimeo, direct mp4 link, etc.)
    videoType: {
      type: String,
      enum: ["upload", "url"],
      required: true,
    },

    // For "upload": relative path like /uploads/videos/169999-file.mp4
    // For "url": the raw external URL the admin pasted
    videoUrl: {
      type: String,
      required: true,
    },

    // Detected/normalized platform, used by the frontend to decide how to render the player
    // "youtube" | "vimeo" | "direct" | "upload"
    platform: {
      type: String,
      enum: ["youtube", "vimeo", "direct", "upload"],
      default: "direct",
    },

    // Relative path (/uploads/thumbnails/xxx.jpg) OR a full external thumbnail URL
    // (auto-fetched for YouTube/Vimeo). Can be null -> frontend shows a default placeholder.
    thumbnail: {
      type: String,
      default: null,
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
  { timestamps: true }
);

module.exports = mongoose.model("Video", videoSchema);
