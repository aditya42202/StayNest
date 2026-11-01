import express from 'express';
import {
  createBooking,
  checkAvailability,
  getMyBookings,
  getBookingById,
  updateBookingStatus,
  getOwnerBookings
} from '../controllers/bookingController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, authorize('user'), createBooking);
router.get('/availability', checkAvailability);
router.get('/me', protect, getMyBookings);
router.get('/owner', protect, authorize('owner', 'admin'), getOwnerBookings);
router.get('/:id', protect, getBookingById);
router.put('/:id/status', protect, authorize('user', 'owner', 'admin'), updateBookingStatus);

export default router;
