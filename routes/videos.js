const express = require('express');
const router = express.Router();
const {
  getVideos,
  getAdminVideos,
  getVideoById,
  createVideo,
  updateVideo,
  deleteVideo
} = require('../controllers/videoController');
const authMiddleware = require('../middleware/auth');
const { uploadVideoWithThumbnail } = require('../middleware/videoUpload');

// Public routes
router.get('/', getVideos);
router.get('/:id', getVideoById);

// Admin routes
router.get('/admin/all', authMiddleware, getAdminVideos);
router.post('/', authMiddleware, uploadVideoWithThumbnail, createVideo);
router.put('/:id', authMiddleware, uploadVideoWithThumbnail, updateVideo);
router.delete('/:id', authMiddleware, deleteVideo);

module.exports = router;
