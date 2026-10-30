import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
  getAdminDashboard,
  getAllUsers,
  getAllProperties,
  getAllBookings,
  updatePropertyVerification
} from '../controllers/adminController.js';

const router = express.Router();

router.use(protect, authorize('admin'));
router.get('/dashboard', getAdminDashboard);
router.get('/users', getAllUsers);
router.get('/properties', getAllProperties);
router.get('/bookings', getAllBookings);
router.put('/properties/:id/verify', updatePropertyVerification);

export default router;
