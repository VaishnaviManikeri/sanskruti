const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth");
const videoUpload = require("../middleware/videoUpload");
const {
  getAllVideos,
  getAllVideosAdmin,
  getVideoById,
  createVideo,
  updateVideo,
  deleteVideo,
} = require("../controllers/videoController");

/* =========================================================
   PUBLIC ROUTES
========================================================= */
router.get("/", getAllVideos);

/* =========================================================
   ADMIN ROUTES (protected)
========================================================= */
router.get("/admin/all", authMiddleware, getAllVideosAdmin);
router.get("/admin/:id", authMiddleware, getVideoById);
router.post("/", authMiddleware, videoUpload, createVideo);
router.put("/:id", authMiddleware, videoUpload, updateVideo);
router.delete("/:id", authMiddleware, deleteVideo);

module.exports = router;
