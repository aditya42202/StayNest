import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
  getOwnerDashboard,
  getOwnerProperties,
  getOwnerBookingRequests,
  verifyBookingRequest
} from '../controllers/ownerController.js';

const router = express.Router();

router.use(protect, authorize('owner'));
router.get('/dashboard', getOwnerDashboard);
router.get('/properties', getOwnerProperties);
router.get('/booking-requests', getOwnerBookingRequests);
router.put('/booking-requests/:id', verifyBookingRequest);

export default router;
