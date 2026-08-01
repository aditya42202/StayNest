import express from 'express';
import {
  getProfile,
  updateProfile,
  getUserWishlist,
  updateUserPreferences
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.get('/wishlist', protect, getUserWishlist);
router.put('/preferences', protect, updateUserPreferences);

export default router;
