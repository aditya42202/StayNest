import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { createComplaint, getUserComplaints, getAllComplaints, updateComplaintStatus } from '../controllers/complaintController.js';

const router = express.Router();
router.use(protect);
router.post('/', createComplaint);
router.get('/me', getUserComplaints);
router.get('/', authorize('admin'), getAllComplaints);
router.put('/:id/status', authorize('admin'), updateComplaintStatus);
export default router;
