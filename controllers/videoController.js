const Video = require("../models/Video");
const path = require("path");
const fs = require("fs");
const axios = require("axios");

// Helper function to extract video ID from various platforms
const extractVideoId = (url) => {
  // YouTube
  let match = url.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
  );
  if (match) return { platform: "youtube", id: match[1] };

  // Vimeo
  match = url.match(/vimeo\.com\/(\d+)/);
  if (match) return { platform: "vimeo", id: match[1] };

  // Dailymotion
  match = url.match(/dailymotion\.com\/video\/([a-zA-Z0-9]+)/);
  if (match) return { platform: "dailymotion", id: match[1] };

  // Facebook
  match = url.match(/facebook\.com\/.*?\/videos\/(\d+)/);
  if (match) return { platform: "facebook", id: match[1] };

  // Instagram
  match = url.match(/instagram\.com\/(?:p|reel)\/([a-zA-Z0-9_-]+)/);
  if (match) return { platform: "instagram", id: match[1] };

  // TikTok
  match = url.match(/tiktok\.com\/@[\w.]+\/video\/(\d+)/);
  if (match) return { platform: "tiktok", id: match[1] };

  // Twitch
  match = url.match(/twitch\.tv\/videos\/(\d+)/);
  if (match) return { platform: "twitch", id: match[1] };

  // Direct video URL (MP4, MOV, etc)
  if (url.match(/\.(mp4|mov|avi|mkv|webm|ogg|3gp)$/i)) {
    return { platform: "direct", id: "direct" };
  }

  return { platform: "unknown", id: null };
};

// Helper to generate thumbnail for direct video URLs
const generateDirectVideoThumbnail = async (videoUrl) => {
  // For direct video URLs, we'll use a default thumbnail or try to extract from the video
  // In production, you might want to use a service like video-thumbnail-generator
  return null;
};

// Helper to get video thumbnail from platform
const getVideoThumbnail = async (url) => {
  const info = extractVideoId(url);

  if (info.platform === "youtube" && info.id) {
    return `https://img.youtube.com/vi/${info.id}/maxresdefault.jpg`;
  }

  if (info.platform === "vimeo" && info.id) {
    try {
      const response = await axios.get(
        `https://vimeo.com/api/v2/video/${info.id}.json`
      );
      if (response.data && response.data[0]) {
        return response.data[0].thumbnail_large;
      }
    } catch (error) {
      console.error("Error fetching Vimeo thumbnail:", error);
    }
  }

  if (info.platform === "dailymotion" && info.id) {
    return `https://www.dailymotion.com/thumbnail/video/${info.id}`;
  }

  // For other platforms or if thumbnail fetch fails, return null
  return null;
};

// Helper to get video duration
const getVideoDuration = async (url) => {
  // This is a placeholder - in production, you might want to use
  // a service or library to get video duration
  return "";
};

// @desc    Create a new video
// @route   POST /api/videos
// @access  Private (Admin)
const createVideo = async (req, res) => {
  try {
    const { title, description, videoUrl, videoType, thumbnailUrl } = req.body;

    // Validate required fields
    if (!title || !videoUrl) {
      return res.status(400).json({
        message: "Title and video URL are required",
      });
    }

    // Get video info and thumbnail
    let thumbnail = thumbnailUrl || (await getVideoThumbnail(videoUrl));
    let videoFile = "";
    let videoDuration = "";

    // Handle file upload
    if (req.files) {
      if (req.files.videoFile && req.files.videoFile[0]) {
        videoFile = `/uploads/videos/${req.files.videoFile[0].filename}`;
        // For uploaded files, try to generate a thumbnail
        // In production, you'd want to use a video processing library
      }

      if (req.files.thumbnailFile && req.files.thumbnailFile[0]) {
        thumbnail = `/uploads/thumbnails/${req.files.thumbnailFile[0].filename}`;
      }
    }

    // If no thumbnail and it's a direct video URL, use a placeholder
    if (!thumbnail && videoUrl) {
      const info = extractVideoId(videoUrl);
      if (info.platform === "direct") {
        // Use a default thumbnail or generate one
        thumbnail = "/uploads/thumbnails/default-video-thumbnail.jpg";
      }
    }

    // Create video document
    const video = new Video({
      title,
      description: description || "",
      videoUrl,
      videoType: videoType || (videoFile ? "upload" : "url"),
      videoFile,
      thumbnailUrl: thumbnail || "",
      duration: videoDuration,
      order: 0,
      isActive: true,
    });

    await video.save();

    res.status(201).json({
      message: "Video created successfully",
      video,
    });
  } catch (error) {
    console.error("Create video error:", error);
    res.status(500).json({
      message: "Error creating video",
      error: error.message,
    });
  }
};

// @desc    Get all videos
// @route   GET /api/videos
// @access  Public
const getAllVideos = async (req, res) => {
  try {
    const { active } = req.query;
    let filter = {};

    if (active === "true") {
      filter.isActive = true;
    } else if (active === "false") {
      filter.isActive = false;
    }

    const videos = await Video.find(filter)
      .sort({ order: 1, createdAt: -1 })
      .lean();

    res.status(200).json(videos);
  } catch (error) {
    console.error("Get videos error:", error);
    res.status(500).json({
      message: "Error fetching videos",
      error: error.message,
    });
  }
};

// @desc    Get single video
// @route   GET /api/videos/:id
// @access  Public
const getVideoById = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id).lean();

    if (!video) {
      return res.status(404).json({
        message: "Video not found",
      });
    }

    // Increment view count
    await Video.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });

    res.status(200).json(video);
  } catch (error) {
    console.error("Get video error:", error);
    res.status(500).json({
      message: "Error fetching video",
      error: error.message,
    });
  }
};

// @desc    Update video
// @route   PUT /api/videos/:id
// @access  Private (Admin)
const updateVideo = async (req, res) => {
  try {
    const { title, description, videoUrl, thumbnailUrl, isActive, order } =
      req.body;

    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({
        message: "Video not found",
      });
    }

    // Update fields
    if (title) video.title = title;
    if (description !== undefined) video.description = description;
    if (videoUrl) {
      video.videoUrl = videoUrl;
      // Update thumbnail if URL changed and no custom thumbnail provided
      if (!thumbnailUrl && !req.files?.thumbnailFile) {
        const newThumbnail = await getVideoThumbnail(videoUrl);
        if (newThumbnail) {
          video.thumbnailUrl = newThumbnail;
        }
      }
    }
    if (thumbnailUrl) video.thumbnailUrl = thumbnailUrl;
    if (isActive !== undefined) video.isActive = isActive;
    if (order !== undefined) video.order = order;

    // Handle file uploads
    if (req.files) {
      if (req.files.videoFile && req.files.videoFile[0]) {
        // Delete old video file if exists
        if (video.videoFile) {
          const oldVideoPath = path.join(__dirname, "..", video.videoFile);
          if (fs.existsSync(oldVideoPath)) {
            fs.unlinkSync(oldVideoPath);
          }
        }
        video.videoFile = `/uploads/videos/${req.files.videoFile[0].filename}`;
        video.videoType = "upload";
      }

      if (req.files.thumbnailFile && req.files.thumbnailFile[0]) {
        // Delete old thumbnail file if exists
        if (video.thumbnailUrl && !video.thumbnailUrl.startsWith("http")) {
          const oldThumbPath = path.join(__dirname, "..", video.thumbnailUrl);
          if (fs.existsSync(oldThumbPath)) {
            fs.unlinkSync(oldThumbPath);
          }
        }
        video.thumbnailUrl = `/uploads/thumbnails/${req.files.thumbnailFile[0].filename}`;
      }
    }

    await video.save();

    res.status(200).json({
      message: "Video updated successfully",
      video,
    });
  } catch (error) {
    console.error("Update video error:", error);
    res.status(500).json({
      message: "Error updating video",
      error: error.message,
    });
  }
};

// @desc    Delete video
// @route   DELETE /api/videos/:id
// @access  Private (Admin)
const deleteVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({
        message: "Video not found",
      });
    }

    // Delete associated files
    if (video.videoFile) {
      const videoPath = path.join(__dirname, "..", video.videoFile);
      if (fs.existsSync(videoPath)) {
        fs.unlinkSync(videoPath);
      }
    }

    if (video.thumbnailUrl && !video.thumbnailUrl.startsWith("http")) {
      const thumbPath = path.join(__dirname, "..", video.thumbnailUrl);
      if (fs.existsSync(thumbPath)) {
        fs.unlinkSync(thumbPath);
      }
    }

    await video.deleteOne();

    res.status(200).json({
      message: "Video deleted successfully",
    });
  } catch (error) {
    console.error("Delete video error:", error);
    res.status(500).json({
      message: "Error deleting video",
      error: error.message,
    });
  }
};

// @desc    Toggle video status
// @route   PATCH /api/videos/:id/toggle
// @access  Private (Admin)
const toggleVideoStatus = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({
        message: "Video not found",
      });
    }

    video.isActive = !video.isActive;
    await video.save();

    res.status(200).json({
      message: `Video ${video.isActive ? "activated" : "deactivated"} successfully`,
      video,
    });
  } catch (error) {
    console.error("Toggle video status error:", error);
    res.status(500).json({
      message: "Error toggling video status",
      error: error.message,
    });
  }
};

// @desc    Update video order
// @route   PUT /api/videos/order
// @access  Private (Admin)
const updateVideoOrder = async (req, res) => {
  try {
    const { videos } = req.body;

    if (!videos || !Array.isArray(videos)) {
      return res.status(400).json({
        message: "Invalid videos data",
      });
    }

    // Update each video's order
    const updatePromises = videos.map((video) =>
      Video.findByIdAndUpdate(video.id, { order: video.order })
    );

    await Promise.all(updatePromises);

    res.status(200).json({
      message: "Video order updated successfully",
    });
  } catch (error) {
    console.error("Update video order error:", error);
    res.status(500).json({
      message: "Error updating video order",
      error: error.message,
    });
  }
};

module.exports = {
  createVideo,
  getAllVideos,
  getVideoById,
  updateVideo,
  deleteVideo,
  toggleVideoStatus,
  updateVideoOrder,
};
