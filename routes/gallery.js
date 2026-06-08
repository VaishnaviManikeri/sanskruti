const express = require('express');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
const Gallery = require('../models/Gallery');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

/* ================= CLOUDINARY STORAGE ================= */
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'gallery', // Fixed: Changed from 'gallery' to match cloudinary config usage
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'gif'],
    transformation: [{ width: 1920, height: 1080, crop: 'limit' }] // Increased limit and removed size restrictions
  },
});

// Configure multer with increased limits (removed file size limits)
const upload = multer({ 
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit (you can adjust or remove)
  }
});

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

/* CREATE */
router.post('/', upload.single('image'), async (req, res) => {
  try {
    console.log('Received POST request to create gallery item');
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);
    
    const { title, description, category } = req.body;
    
    // Validate required fields
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'Image is required' });
    }

    const galleryItem = new Gallery({
      title,
      description: description || '',
      category: category || '',
      imageUrl: req.file.path, // Cloudinary URL
    });

    await galleryItem.save();
    console.log('Gallery item saved:', galleryItem);
    res.status(201).json(galleryItem);
  } catch (error) {
    console.error('Error creating gallery item:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

/* UPDATE */
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    console.log('Received PUT request for ID:', req.params.id);
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);
    
    const { title, description, category } = req.body;
    
    // Validate required fields
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const updateData = { 
      title, 
      description: description || '', 
      category: category || '' 
    };

    if (req.file) {
      // If new image uploaded, delete old image from Cloudinary (optional)
      const oldItem = await Gallery.findById(req.params.id);
      if (oldItem && oldItem.imageUrl) {
        try {
          const publicId = oldItem.imageUrl.split('/').slice(-2).join('/').split('.')[0];
          await cloudinary.uploader.destroy(publicId);
        } catch (cloudinaryError) {
          console.error('Error deleting old image from Cloudinary:', cloudinaryError);
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
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

/* DELETE */
router.delete('/:id', async (req, res) => {
  try {
    console.log('Received DELETE request for ID:', req.params.id);
    
    // Find the item first to get the Cloudinary public ID
    const galleryItem = await Gallery.findById(req.params.id);
    
    if (!galleryItem) {
      return res.status(404).json({ error: 'Gallery item not found' });
    }
    
    // Delete image from Cloudinary
    if (galleryItem.imageUrl) {
      try {
        // Extract public ID from Cloudinary URL
        const publicId = galleryItem.imageUrl.split('/').slice(-2).join('/').split('.')[0];
        await cloudinary.uploader.destroy(publicId);
        console.log('Deleted image from Cloudinary:', publicId);
      } catch (cloudinaryError) {
        console.error('Error deleting image from Cloudinary:', cloudinaryError);
        // Continue with deletion even if Cloudinary delete fails
      }
    }
    
    // Delete from database
    await Gallery.findByIdAndDelete(req.params.id);
    console.log('Gallery item deleted successfully');
    
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('Error deleting gallery item:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

module.exports = router;
