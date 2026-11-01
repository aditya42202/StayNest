import express from 'express';
import passport from 'passport';
import {
  registerUser,
  loginUser,
  resetPasswordRequest,
  resetPassword,
  verifyEmail,
  resendVerificationCode,
  refreshSession,
  logoutUser,
  googleAuth,
  googleAuthCallback
} from '../controllers/authController.js';
import {
  loginLimiter,
  passwordResetLimiter,
  refreshLimiter,
  registrationLimiter,
  resendVerificationLimiter,
  verificationLimiter
} from '../middleware/authRateLimiters.js';

const router = express.Router();

router.post('/register', registrationLimiter, registerUser);
router.post('/login', loginLimiter, loginUser);
router.post('/forgot-password', passwordResetLimiter, resetPasswordRequest);
router.post('/reset-password/:token', passwordResetLimiter, resetPassword);
router.post('/verify-email', verificationLimiter, verifyEmail);
router.post('/resend-verification', resendVerificationLimiter, resendVerificationCode);
router.post('/refresh', refreshLimiter, refreshSession);
router.post('/logout', logoutUser);
router.get('/google', loginLimiter, googleAuth);
router.get('/google/callback', passport.authenticate('google', { session: false }), googleAuthCallback);

export default router;
