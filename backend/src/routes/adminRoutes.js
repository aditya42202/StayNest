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
import {
  approveOwnerListingRequest,
  getOwnerListingRequests,
  rejectOwnerListingRequest
} from '../controllers/ownerListingRequestController.js';

const router = express.Router();

router.use(protect, authorize('admin'));
router.get('/dashboard', getAdminDashboard);
router.get('/users', getAllUsers);
router.get('/properties', getAllProperties);
router.get('/owner-listing-requests', getOwnerListingRequests);
router.post('/owner-listing-requests/:id/approve', approveOwnerListingRequest);
router.post('/owner-listing-requests/:id/reject', rejectOwnerListingRequest);
router.get('/bookings', getAllBookings);
router.put('/properties/:id/verify', updatePropertyVerification);
router.put('/users/:id/status', updateUserStatus);
router.put('/owners/:id/verify', updateOwnerVerification);
router.get('/payments', getAllPayments);
router.get('/reviews', getAllReviews);
router.delete('/reviews/:id', deleteReview);

export default router;
