import express from 'express';
import passport from 'passport';
import {
  registerUser,
  loginUser,
  resetPasswordRequest,
  verifyEmail,
  googleAuth,
  googleAuthCallback
} from '../controllers/authController.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/reset-password', resetPasswordRequest);
router.post('/verify-email', verifyEmail);
router.get('/google', googleAuth);
router.get('/google/callback', passport.authenticate('google', { session: false }), googleAuthCallback);

export default router;
