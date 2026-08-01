import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { createPaymentIntent, getPaymentHistory } from '../controllers/paymentController.js';

const router = express.Router();

router.post('/intent', protect, createPaymentIntent);
router.get('/history', protect, getPaymentHistory);

export default router;
