import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { createPaymentIntent, getPaymentHistory } from '../controllers/paymentController.js';

const router = express.Router();

router.post('/intent', protect, authorize('user'), createPaymentIntent);
router.get('/history', protect, getPaymentHistory);

export default router;
