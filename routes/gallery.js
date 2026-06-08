const express = require('express');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
const Gallery = require('../models/Gallery');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

/* ================= CLOUDINARY STORAGE ================= */
// Create storage configuration for gallery
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'gallery',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'gif'],
    transformation: [{ width: 1920, height: 1080, crop: 'limit' }]
  },
});

// Configure multer with error handling
const upload = multer({ 
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
}).single('image'); // Specify single file upload

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Max size is 50MB.' });
    }
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  next(err);
};

/* ================= PUBLIC ROUTE ================= */
router.get('/', async (req, res) => {
  try {
    const gallery = await Gallery.find().sort({ createdAt: -1 });
    res.json(gallery);
  } catch (error) {
    console.error('Error fetching gallery:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/* ================= PROTECTED ROUTES ================= */
router.use(authMiddleware);

/* CREATE - FIXED VERSION */
router.post('/', (req, res, next) => {
  // First, handle file upload
  upload(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      return handleMulterError(err, req, res, next);
    }
    next();
  });
}, async (req, res) => {
  try {
    console.log('=== GALLERY CREATE REQUEST ===');
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    console.log('File:', req.file);
    
    const { title, description, category } = req.body;
    
    // Validate required fields
    if (!title) {
      console.log('Validation failed: Title is missing');
      return res.status(400).json({ error: 'Title is required' });
    }
    
    if (!req.file) {
      console.log('Validation failed: Image file is missing');
      return res.status(400).json({ error: 'Image file is required' });
    }
    
    if (!req.file.path) {
      console.log('Validation failed: Cloudinary URL is missing');
      return res.status(400).json({ error: 'Image upload failed - no URL returned' });
    }

    // Create gallery item
    const galleryItem = new Gallery({
      title: title.trim(),
      description: description ? description.trim() : '',
      category: category ? category.trim() : '',
      imageUrl: req.file.path, // Cloudinary URL
    });

    console.log('Saving gallery item:', galleryItem);
    await galleryItem.save();
    
    console.log('Gallery item saved successfully:', galleryItem);
    res.status(201).json(galleryItem);
    
  } catch (error) {
    console.error('Error in gallery create route:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Server error while creating gallery item',
      details: error.message 
    });
  }
});

/* UPDATE */
router.put('/:id', (req, res, next) => {
  upload(req, res, (err) => {
    if (err) {
      console.error('Multer error on update:', err);
      return handleMulterError(err, req, res, next);
    }
    next();
  });
}, async (req, res) => {
  try {
    console.log('=== GALLERY UPDATE REQUEST ===');
    console.log('ID:', req.params.id);
    console.log('Body:', req.body);
    console.log('File:', req.file);
    
    const { title, description, category } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const updateData = { 
      title: title.trim(), 
      description: description ? description.trim() : '', 
      category: category ? category.trim() : ''
    };

    // Handle image update
    if (req.file) {
      if (!req.file.path) {
        return res.status(400).json({ error: 'Image upload failed' });
      }
      
      // Delete old image from Cloudinary
      const oldItem = await Gallery.findById(req.params.id);
      if (oldItem && oldItem.imageUrl) {
        try {
          const publicId = oldItem.imageUrl.split('/').slice(-2).join('/').split('.')[0];
          await cloudinary.uploader.destroy(publicId);
          console.log('Old image deleted from Cloudinary:', publicId);
        } catch (cloudinaryError) {
          console.error('Error deleting old image:', cloudinaryError);
        }
      }
      updateData.imageUrl = req.file.path;
    }

    const galleryItem = await Gallery.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!galleryItem) {
      return res.status(404).json({ error: 'Gallery item not found' });
    }

    console.log('Gallery item updated:', galleryItem);
    res.json(galleryItem);
    
  } catch (error) {
    console.error('Error updating gallery item:', error);
    res.status(500).json({ 
      error: 'Server error while updating gallery item',
      details: error.message 
    });
  }
});

/* DELETE */
router.delete('/:id', async (req, res) => {
  try {
    console.log('=== GALLERY DELETE REQUEST ===');
    console.log('ID:', req.params.id);
    
    const galleryItem = await Gallery.findById(req.params.id);
    
    if (!galleryItem) {
      return res.status(404).json({ error: 'Gallery item not found' });
    }
    
    // Delete image from Cloudinary
    if (galleryItem.imageUrl) {
      try {
        const publicId = galleryItem.imageUrl.split('/').slice(-2).join('/').split('.')[0];
        await cloudinary.uploader.destroy(publicId);
        console.log('Image deleted from Cloudinary:', publicId);
      } catch (cloudinaryError) {
        console.error('Error deleting image from Cloudinary:', cloudinaryError);
      }
    }
    
    await Gallery.findByIdAndDelete(req.params.id);
    console.log('Gallery item deleted successfully');
    
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('Error deleting gallery item:', error);
    res.status(500).json({ 
      error: 'Server error while deleting gallery item',
      details: error.message 
    });
  }
});

module.exports = router;
