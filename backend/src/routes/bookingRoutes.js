import express from 'express';
import {
  createBooking,
  getMyBookings,
  getBookingById,
  updateBookingStatus,
  getOwnerBookings
} from '../controllers/bookingController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, authorize('student'), createBooking);
router.get('/me', protect, getMyBookings);
router.get('/owner', protect, authorize('owner', 'admin'), getOwnerBookings);
router.get('/:id', protect, getBookingById);
router.put('/:id/status', protect, authorize('owner', 'admin'), updateBookingStatus);

export default router;
