// backend/routes/videos.js
const express = require('express');
const router = express.Router();
const videoController = require('../controllers/videoController');
const upload = require('../middleware/videoUpload');
const auth = require('../middleware/auth');

// Public routes
router.get('/public', videoController.getPublicVideos);

// Protected routes (admin only)
router.get('/', auth, videoController.getVideos);
router.get('/:id', auth, videoController.getVideo);

// Create video with file upload
router.post(
  '/',
  auth,
  upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
  ]),
  videoController.createVideo
);

// Update video
router.put(
  '/:id',
  auth,
  upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
  ]),
  videoController.updateVideo
);

// Delete video
router.delete('/:id', auth, videoController.deleteVideo);

// Update views (public)
router.post('/:id/views', videoController.updateViews);

module.exports = router;
