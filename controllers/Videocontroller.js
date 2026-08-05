const fs = require("fs");
const path = require("path");
const axios = require("axios");
const Video = require("../models/Video");

/* =========================================================
   HELPERS
========================================================= */

// Detect platform + normalized video id from a pasted URL
const detectPlatform = (url) => {
  if (!url) return { platform: "direct" };

  const youtubeMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (youtubeMatch) {
    return { platform: "youtube", id: youtubeMatch[1] };
  }

  const vimeoMatch = url.match(/vimeo\.com\/(?:.*\/)?(\d+)/);
  if (vimeoMatch) {
    return { platform: "vimeo", id: vimeoMatch[1] };
  }

  return { platform: "direct" };
};

// Try to auto-fetch a thumbnail for a pasted URL (YouTube / Vimeo).
// Falls back to null (frontend shows a default placeholder) if it can't.
const autoFetchThumbnail = async (url) => {
  const { platform, id } = detectPlatform(url);

  try {
    if (platform === "youtube" && id) {
      // YouTube always serves a predictable thumbnail at this path
      return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
    }

    if (platform === "vimeo") {
      const res = await axios.get(
        `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`
      );
      if (res.data && res.data.thumbnail_url) {
        return res.data.thumbnail_url;
      }
    }
  } catch (err) {
    console.error("⚠️ Could not auto-fetch thumbnail:", err.message);
  }

  return null;
};

// Delete a locally-stored file (upload) safely, ignoring external URLs
const deleteLocalFile = (relativePath) => {
  if (!relativePath || !relativePath.startsWith("/uploads/")) return;
  const fullPath = path.join(__dirname, "..", relativePath);
  fs.unlink(fullPath, (err) => {
    if (err && err.code !== "ENOENT") {
      console.error("⚠️ Failed to delete file:", fullPath, err.message);
    }
  });
};

/* =========================================================
   PUBLIC: GET ALL ACTIVE VIDEOS
========================================================= */
exports.getAllVideos = async (req, res) => {
  try {
    const videos = await Video.find({ isActive: true }).sort({
      order: 1,
      createdAt: -1,
    });
    res.status(200).json({ videos });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch videos", error: error.message });
  }
};

/* =========================================================
   ADMIN: GET ALL VIDEOS (including inactive)
========================================================= */
exports.getAllVideosAdmin = async (req, res) => {
  try {
    const videos = await Video.find().sort({ order: 1, createdAt: -1 });
    res.status(200).json({ videos });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch videos", error: error.message });
  }
};

/* =========================================================
   ADMIN: GET SINGLE VIDEO
========================================================= */
exports.getVideoById = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: "Video not found" });
    res.status(200).json({ video });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch video", error: error.message });
  }
};

/* =========================================================
   ADMIN: CREATE VIDEO
========================================================= */
exports.createVideo = async (req, res) => {
  try {
    const { title, description, videoType, videoUrl, order } = req.body;

    if (!title || !videoType) {
      return res.status(400).json({ message: "Title and videoType are required" });
    }

    let finalVideoUrl;
    let platform = "direct";
    let thumbnail = null;

    if (videoType === "upload") {
      if (!req.files || !req.files.video) {
        return res.status(400).json({ message: "A video file is required for upload type" });
      }
      finalVideoUrl = `/uploads/videos/${req.files.video[0].filename}`;
      platform = "upload";
    } else if (videoType === "url") {
      if (!videoUrl) {
        return res.status(400).json({ message: "videoUrl is required for url type" });
      }
      finalVideoUrl = videoUrl.trim();
      platform = detectPlatform(finalVideoUrl).platform;
    } else {
      return res.status(400).json({ message: "videoType must be 'upload' or 'url'" });
    }

    // Thumbnail priority: custom uploaded file > auto-fetched (for url type) > null
    if (req.files && req.files.thumbnail) {
      thumbnail = `/uploads/thumbnails/${req.files.thumbnail[0].filename}`;
    } else if (videoType === "url") {
      thumbnail = await autoFetchThumbnail(finalVideoUrl);
    }

    const video = await Video.create({
      title: title.trim(),
      description: description ? description.trim() : "",
      videoType,
      videoUrl: finalVideoUrl,
      platform,
      thumbnail,
      order: order ? Number(order) : 0,
    });

    res.status(201).json({ message: "Video created successfully", video });
  } catch (error) {
    res.status(500).json({ message: "Failed to create video", error: error.message });
  }
};

/* =========================================================
   ADMIN: UPDATE VIDEO
========================================================= */
exports.updateVideo = async (req, res) => {
  try {
    const existing = await Video.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Video not found" });

    const { title, description, videoType, videoUrl, order, isActive } = req.body;

    const updates = {};
    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description.trim();
    if (order !== undefined) updates.order = Number(order);
    if (isActive !== undefined) updates.isActive = isActive === "true" || isActive === true;

    const nextVideoType = videoType || existing.videoType;
    updates.videoType = nextVideoType;

    // Handle replacing the actual video source
    if (nextVideoType === "upload") {
      if (req.files && req.files.video) {
        // Replacing with a new uploaded file
        if (existing.videoType === "upload") deleteLocalFile(existing.videoUrl);
        updates.videoUrl = `/uploads/videos/${req.files.video[0].filename}`;
        updates.platform = "upload";
      } else if (existing.videoType !== "upload") {
        return res.status(400).json({ message: "A video file is required to switch to upload type" });
      }
    } else if (nextVideoType === "url") {
      if (videoUrl) {
        if (existing.videoType === "upload") deleteLocalFile(existing.videoUrl);
        updates.videoUrl = videoUrl.trim();
        updates.platform = detectPlatform(updates.videoUrl).platform;
      } else if (existing.videoType !== "url") {
        return res.status(400).json({ message: "videoUrl is required to switch to url type" });
      }
    }

    // Handle thumbnail replacement
    if (req.files && req.files.thumbnail) {
      if (existing.thumbnail && existing.thumbnail.startsWith("/uploads/")) {
        deleteLocalFile(existing.thumbnail);
      }
      updates.thumbnail = `/uploads/thumbnails/${req.files.thumbnail[0].filename}`;
    } else if (updates.videoUrl && nextVideoType === "url" && !existing.thumbnail) {
      // If URL changed and there was no thumbnail before, try auto-fetching one
      updates.thumbnail = await autoFetchThumbnail(updates.videoUrl);
    }

    const video = await Video.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ message: "Video updated successfully", video });
  } catch (error) {
    res.status(500).json({ message: "Failed to update video", error: error.message });
  }
};

/* =========================================================
   ADMIN: DELETE VIDEO
========================================================= */
exports.deleteVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: "Video not found" });

    if (video.videoType === "upload") deleteLocalFile(video.videoUrl);
    if (video.thumbnail && video.thumbnail.startsWith("/uploads/")) {
      deleteLocalFile(video.thumbnail);
    }

    await Video.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Video deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete video", error: error.message });
  }
};
