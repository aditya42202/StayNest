import express from 'express';
import {
  createProperty,
  getProperties,
  getPropertyById,
  updateProperty,
  deleteProperty,
  getFeaturedProperties,
  searchProperties,
  addWishlist,
  removeWishlist
} from '../controllers/propertyController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getProperties);
router.get('/search', searchProperties);
router.get('/featured', getFeaturedProperties);
router.get('/:id', getPropertyById);
router.post('/', protect, authorize('owner', 'admin'), createProperty);
router.put('/:id', protect, authorize('owner', 'admin'), updateProperty);
router.delete('/:id', protect, authorize('owner', 'admin'), deleteProperty);
router.post('/:id/wishlist', protect, addWishlist);
router.delete('/:id/wishlist', protect, removeWishlist);

export default router;
