const Video = require('../models/Video');
const path = require('path');
const fs = require('fs');

// Helper function to extract video ID from various URL formats
const extractVideoId = (url) => {
  // YouTube
  const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const youtubeMatch = url.match(youtubeRegex);
  if (youtubeMatch) return { platform: 'youtube', id: youtubeMatch[1] };

  // Vimeo
  const vimeoRegex = /(?:vimeo\.com\/)(\d+)/;
  const vimeoMatch = url.match(vimeoRegex);
  if (vimeoMatch) return { platform: 'vimeo', id: vimeoMatch[1] };

  // Dailymotion
  const dailymotionRegex = /(?:dailymotion\.com\/video\/)([a-zA-Z0-9]+)/;
  const dailymotionMatch = url.match(dailymotionRegex);
  if (dailymotionMatch) return { platform: 'dailymotion', id: dailymotionMatch[1] };

  // Facebook
  const facebookRegex = /(?:facebook\.com\/.*\/videos\/)(\d+)/;
  const facebookMatch = url.match(facebookRegex);
  if (facebookMatch) return { platform: 'facebook', id: facebookMatch[1] };

  // Twitch
  const twitchRegex = /(?:twitch\.tv\/videos\/)(\d+)/;
  const twitchMatch = url.match(twitchRegex);
  if (twitchMatch) return { platform: 'twitch', id: twitchMatch[1] };

  // Direct video URL (mp4, webm, etc.)
  const directVideoRegex = /\.(mp4|webm|ogg|mov|avi|mkv)$/i;
  if (directVideoRegex.test(url)) return { platform: 'direct', id: url };

  return null;
};

// @desc    Get all videos
// @route   GET /api/videos
// @access  Public
const getVideos = async (req, res) => {
  try {
    const videos = await Video.find({ isActive: true })
      .sort({ createdAt: -1 });
    
    res.status(200).json(videos);
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
};

// @desc    Get all videos (Admin)
// @route   GET /api/videos/admin/all
// @access  Private
const getAdminVideos = async (req, res) => {
  try {
    const videos = await Video.find()
      .sort({ createdAt: -1 });
    
    res.status(200).json(videos);
  } catch (error) {
    console.error('Error fetching admin videos:', error);
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
};

// @desc    Get single video
// @route   GET /api/videos/:id
// @access  Public
const getVideoById = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Increment views
    video.views += 1;
    await video.save();

    res.status(200).json(video);
  } catch (error) {
    console.error('Error fetching video:', error);
    res.status(500).json({ error: 'Failed to fetch video' });
  }
};

// @desc    Create video
// @route   POST /api/videos
// @access  Private
const createVideo = async (req, res) => {
  try {
    const { title, description, videoUrl, videoType, isActive } = req.body;
    
    // Validate required fields
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    if (!videoUrl && !req.files?.video) {
      return res.status(400).json({ error: 'Video URL or file is required' });
    }

    // Prepare video data
    const videoData = {
      title,
      description: description || '',
      videoType: videoType || 'url',
      isActive: isActive !== undefined ? isActive : true
    };

    // Handle uploaded video file
    if (req.files?.video) {
      const videoFile = req.files.video[0];
      videoData.videoFile = `/uploads/videos/${videoFile.filename}`;
      videoData.videoUrl = videoData.videoFile;
    } else if (videoUrl) {
      // Validate URL
      try {
        new URL(videoUrl);
        videoData.videoUrl = videoUrl;
      } catch (error) {
        return res.status(400).json({ error: 'Invalid URL format' });
      }
    }

    // Handle thumbnail
    if (req.files?.thumbnail) {
      const thumbnailFile = req.files.thumbnail[0];
      videoData.thumbnail = `/uploads/thumbnails/${thumbnailFile.filename}`;
    } else if (videoUrl) {
      // Try to generate thumbnail from URL
      const videoInfo = extractVideoId(videoUrl);
      if (videoInfo) {
        switch (videoInfo.platform) {
          case 'youtube':
            videoData.thumbnail = `https://img.youtube.com/vi/${videoInfo.id}/maxresdefault.jpg`;
            break;
          case 'vimeo':
            videoData.thumbnail = await fetchVimeoThumbnail(videoInfo.id);
            break;
          default:
            // Use default thumbnail
            videoData.thumbnail = '/default-thumbnail.jpg';
        }
      } else {
        // Use default thumbnail for direct URLs
        videoData.thumbnail = '/default-thumbnail.jpg';
      }
    } else {
      // Use default thumbnail
      videoData.thumbnail = '/default-thumbnail.jpg';
    }

    const video = await Video.create(videoData);
    res.status(201).json(video);
  } catch (error) {
    console.error('Error creating video:', error);
    res.status(500).json({ error: 'Failed to create video' });
  }
};

// Helper function to fetch Vimeo thumbnail
const fetchVimeoThumbnail = async (videoId) => {
  try {
    const response = await fetch(`https://vimeo.com/api/v2/video/${videoId}.json`);
    if (response.ok) {
      const data = await response.json();
      if (data && data[0] && data[0].thumbnail_large) {
        return data[0].thumbnail_large;
      }
    }
    return '/default-thumbnail.jpg';
  } catch (error) {
    return '/default-thumbnail.jpg';
  }
};

// @desc    Update video
// @route   PUT /api/videos/:id
// @access  Private
const updateVideo = async (req, res) => {
  try {
    const { title, description, videoUrl, videoType, isActive } = req.body;
    
    let video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Update fields
    if (title) video.title = title;
    if (description !== undefined) video.description = description;
    if (videoType) video.videoType = videoType;
    if (isActive !== undefined) video.isActive = isActive;

    // Handle video file update
    if (req.files?.video) {
      // Delete old video file if exists
      if (video.videoFile) {
        const oldPath = path.join(__dirname, '..', video.videoFile);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      const videoFile = req.files.video[0];
      video.videoFile = `/uploads/videos/${videoFile.filename}`;
      video.videoUrl = video.videoFile;
    } else if (videoUrl) {
      // Validate URL
      try {
        new URL(videoUrl);
        video.videoUrl = videoUrl;
      } catch (error) {
        return res.status(400).json({ error: 'Invalid URL format' });
      }
    }

    // Handle thumbnail update
    if (req.files?.thumbnail) {
      // Delete old thumbnail if exists
      if (video.thumbnail && !video.thumbnail.includes('default-thumbnail') && 
          !video.thumbnail.includes('img.youtube.com')) {
        const oldPath = path.join(__dirname, '..', video.thumbnail);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      const thumbnailFile = req.files.thumbnail[0];
      video.thumbnail = `/uploads/thumbnails/${thumbnailFile.filename}`;
    } else if (videoUrl && videoUrl !== video.videoUrl) {
      // Generate thumbnail for new URL
      const videoInfo = extractVideoId(videoUrl);
      if (videoInfo) {
        switch (videoInfo.platform) {
          case 'youtube':
            video.thumbnail = `https://img.youtube.com/vi/${videoInfo.id}/maxresdefault.jpg`;
            break;
          case 'vimeo':
            video.thumbnail = await fetchVimeoThumbnail(videoInfo.id);
            break;
          default:
            video.thumbnail = '/default-thumbnail.jpg';
        }
      } else {
        video.thumbnail = '/default-thumbnail.jpg';
      }
    }

    await video.save();
    res.status(200).json(video);
  } catch (error) {
    console.error('Error updating video:', error);
    res.status(500).json({ error: 'Failed to update video' });
  }
};

// @desc    Delete video
// @route   DELETE /api/videos/:id
// @access  Private
const deleteVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Delete video file if exists
    if (video.videoFile) {
      const videoPath = path.join(__dirname, '..', video.videoFile);
      if (fs.existsSync(videoPath)) {
        fs.unlinkSync(videoPath);
      }
    }

    // Delete thumbnail if exists and not default
    if (video.thumbnail && !video.thumbnail.includes('default-thumbnail') && 
        !video.thumbnail.includes('img.youtube.com')) {
      const thumbnailPath = path.join(__dirname, '..', video.thumbnail);
      if (fs.existsSync(thumbnailPath)) {
        fs.unlinkSync(thumbnailPath);
      }
    }

    await video.deleteOne();
    res.status(200).json({ message: 'Video deleted successfully' });
  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({ error: 'Failed to delete video' });
  }
};

module.exports = {
  getVideos,
  getAdminVideos,
  getVideoById,
  createVideo,
  updateVideo,
  deleteVideo
};
