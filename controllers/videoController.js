// backend/controllers/videoController.js
const Video = require('../models/Video');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

// Helper function to get video ID from URL
const getVideoId = (url) => {
  // YouTube
  const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const youtubeMatch = url.match(youtubeRegex);
  if (youtubeMatch) return { platform: 'youtube', id: youtubeMatch[1] };
  
  // Vimeo
  const vimeoRegex = /(?:vimeo\.com\/)([0-9]+)/i;
  const vimeoMatch = url.match(vimeoRegex);
  if (vimeoMatch) return { platform: 'vimeo', id: vimeoMatch[1] };
  
  return null;
};

// Get all videos (admin)
exports.getVideos = async (req, res) => {
  try {
    const videos = await Video.find()
      .sort({ createdAt: -1 })
      .select('-__v');
    
    res.status(200).json({
      success: true,
      count: videos.length,
      videos,
    });
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching videos',
      error: error.message,
    });
  }
};

// Get public videos (active only)
exports.getPublicVideos = async (req, res) => {
  try {
    const videos = await Video.find({ isActive: true })
      .sort({ createdAt: -1 })
      .select('-__v');
    
    res.status(200).json({
      success: true,
      count: videos.length,
      videos,
    });
  } catch (error) {
    console.error('Error fetching public videos:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching videos',
      error: error.message,
    });
  }
};

// Get single video
exports.getVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found',
      });
    }
    
    // Increment views
    video.views += 1;
    await video.save();
    
    res.status(200).json({
      success: true,
      video,
    });
  } catch (error) {
    console.error('Error fetching video:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching video',
      error: error.message,
    });
  }
};

// Create video
exports.createVideo = async (req, res) => {
  try {
    const { title, description, videoUrl, videoType, uploadedBy } = req.body;
    
    // Validate required fields
    if (!title || !videoUrl || !videoType) {
      return res.status(400).json({
        success: false,
        message: 'Title, video URL, and video type are required',
      });
    }
    
    let thumbnail = '';
    
    // If video is uploaded, use the uploaded file path
    if (videoType === 'upload' && req.files && req.files.video) {
      const videoFile = req.files.video[0];
      
      // Generate thumbnail from uploaded video (using a default or first frame)
      // For simplicity, we'll use a default thumbnail
      thumbnail = req.files.thumbnail 
        ? `/uploads/thumbnails/${req.files.thumbnail[0].filename}`
        : '/uploads/thumbnails/default-thumbnail.jpg';
      
      // Create video document
      const video = new Video({
        title,
        description: description || '',
        videoUrl: `/uploads/videos/${videoFile.filename}`,
        thumbnail,
        videoType: 'upload',
        uploadedBy: uploadedBy || 'Admin',
      });
      
      await video.save();
      
      return res.status(201).json({
        success: true,
        message: 'Video uploaded successfully',
        video,
      });
    }
    
    // If video is from URL
    if (videoType === 'url') {
      // Generate thumbnail based on URL
      const videoId = getVideoId(videoUrl);
      
      if (videoId) {
        if (videoId.platform === 'youtube') {
          thumbnail = `https://img.youtube.com/vi/${videoId.id}/maxresdefault.jpg`;
        } else if (videoId.platform === 'vimeo') {
          try {
            const response = await axios.get(`https://vimeo.com/api/v2/video/${videoId.id}.json`);
            if (response.data && response.data[0]) {
              thumbnail = response.data[0].thumbnail_large;
            }
          } catch (error) {
            console.error('Error fetching Vimeo thumbnail:', error);
            thumbnail = '/uploads/thumbnails/default-thumbnail.jpg';
          }
        }
      } else {
        // If not YouTube or Vimeo, use default thumbnail
        thumbnail = '/uploads/thumbnails/default-thumbnail.jpg';
      }
      
      // Use custom thumbnail if provided
      if (req.files && req.files.thumbnail) {
        thumbnail = `/uploads/thumbnails/${req.files.thumbnail[0].filename}`;
      }
      
      const video = new Video({
        title,
        description: description || '',
        videoUrl,
        thumbnail,
        videoType: 'url',
        uploadedBy: uploadedBy || 'Admin',
      });
      
      await video.save();
      
      return res.status(201).json({
        success: true,
        message: 'Video added successfully',
        video,
      });
    }
    
    return res.status(400).json({
      success: false,
      message: 'Invalid video type',
    });
  } catch (error) {
    console.error('Error creating video:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating video',
      error: error.message,
    });
  }
};

// Update video
exports.updateVideo = async (req, res) => {
  try {
    const { title, description, videoUrl, videoType, isActive } = req.body;
    const video = await Video.findById(req.params.id);
    
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found',
      });
    }
    
    // Update fields
    if (title) video.title = title;
    if (description !== undefined) video.description = description;
    if (isActive !== undefined) video.isActive = isActive;
    
    // Handle video update
    if (videoType === 'upload' && req.files && req.files.video) {
      // Delete old video file if it exists and was uploaded
      if (video.videoType === 'upload' && video.videoUrl) {
        const oldVideoPath = path.join(__dirname, '..', video.videoUrl);
        if (fs.existsSync(oldVideoPath)) {
          fs.unlinkSync(oldVideoPath);
        }
      }
      
      const videoFile = req.files.video[0];
      video.videoUrl = `/uploads/videos/${videoFile.filename}`;
      video.videoType = 'upload';
    } else if (videoType === 'url' && videoUrl) {
      video.videoUrl = videoUrl;
      video.videoType = 'url';
      
      // Update thumbnail for new URL if no custom thumbnail
      if (!req.files || !req.files.thumbnail) {
        const videoId = getVideoId(videoUrl);
        if (videoId) {
          if (videoId.platform === 'youtube') {
            video.thumbnail = `https://img.youtube.com/vi/${videoId.id}/maxresdefault.jpg`;
          } else if (videoId.platform === 'vimeo') {
            try {
              const response = await axios.get(`https://vimeo.com/api/v2/video/${videoId.id}.json`);
              if (response.data && response.data[0]) {
                video.thumbnail = response.data[0].thumbnail_large;
              }
            } catch (error) {
              console.error('Error fetching Vimeo thumbnail:', error);
            }
          }
        }
      }
    }
    
    // Handle thumbnail update
    if (req.files && req.files.thumbnail) {
      // Delete old thumbnail if it exists and is not default
      if (video.thumbnail && !video.thumbnail.includes('default-thumbnail')) {
        const oldThumbnailPath = path.join(__dirname, '..', video.thumbnail);
        if (fs.existsSync(oldThumbnailPath)) {
          fs.unlinkSync(oldThumbnailPath);
        }
      }
      
      video.thumbnail = `/uploads/thumbnails/${req.files.thumbnail[0].filename}`;
    }
    
    await video.save();
    
    res.status(200).json({
      success: true,
      message: 'Video updated successfully',
      video,
    });
  } catch (error) {
    console.error('Error updating video:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating video',
      error: error.message,
    });
  }
};

// Delete video
exports.deleteVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found',
      });
    }
    
    // Delete video file if it exists and was uploaded
    if (video.videoType === 'upload' && video.videoUrl) {
      const videoPath = path.join(__dirname, '..', video.videoUrl);
      if (fs.existsSync(videoPath)) {
        fs.unlinkSync(videoPath);
      }
    }
    
    // Delete thumbnail if it exists and is not default
    if (video.thumbnail && !video.thumbnail.includes('default-thumbnail')) {
      const thumbnailPath = path.join(__dirname, '..', video.thumbnail);
      if (fs.existsSync(thumbnailPath)) {
        fs.unlinkSync(thumbnailPath);
      }
    }
    
    await video.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Video deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting video',
      error: error.message,
    });
  }
};

// Update video views
exports.updateViews = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found',
      });
    }
    
    video.views += 1;
    await video.save();
    
    res.status(200).json({
      success: true,
      views: video.views,
    });
  } catch (error) {
    console.error('Error updating views:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating views',
      error: error.message,
    });
  }
};
