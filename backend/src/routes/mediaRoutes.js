import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { uploadImage } from '../controllers/cloudinaryController.js';

const router = express.Router();

router.post('/upload', protect, authorize('owner', 'admin'), uploadImage);

export default router;
