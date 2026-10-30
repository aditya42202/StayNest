import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
  getAdminDashboard,
  getAllUsers,
  getAllProperties,
  getAllBookings,
  updatePropertyVerification,
  updateUserStatus,
  updateOwnerVerification,
  getAllPayments,
  getAllReviews,
  deleteReview
} from '../controllers/adminController.js';

const router = express.Router();

router.use(protect, authorize('admin'));
router.get('/dashboard', getAdminDashboard);
router.get('/users', getAllUsers);
router.get('/properties', getAllProperties);
router.get('/bookings', getAllBookings);
router.put('/properties/:id/verify', updatePropertyVerification);
router.put('/users/:id/status', updateUserStatus);
router.put('/owners/:id/verify', updateOwnerVerification);
router.get('/payments', getAllPayments);
router.get('/reviews', getAllReviews);
router.delete('/reviews/:id', deleteReview);

export default router;
