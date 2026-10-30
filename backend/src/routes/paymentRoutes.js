import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { confirmCheckoutSession, createCheckoutSession, getPaymentHistory } from '../controllers/paymentController.js';

const router = express.Router();

router.post('/checkout', protect, authorize('user'), createCheckoutSession);
router.post('/checkout/:sessionId/confirm', protect, authorize('user'), confirmCheckoutSession);
router.get('/history', protect, getPaymentHistory);

export default router;
