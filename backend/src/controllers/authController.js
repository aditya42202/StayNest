import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';
import { sendEmail } from '../utils/sendEmail.js';

const saltRounds = 10;

export const registerUser = async (req, res) => {
  const { name, email, password, role } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    res.status(400);
    throw new Error('Email already registered');
  }

  const hashedPassword = await bcrypt.hash(password, saltRounds);
  const user = await User.create({ name, email, password: hashedPassword, role });

  const token = generateToken(user);
  if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    try {
      await sendEmail({
        to: email,
        subject: 'Verify your StayNest AI account',
        text: `Use this link to verify your email: ${process.env.CLIENT_URL}/verify/${token}`
      });
    } catch (emailError) {
      console.warn('Verification email could not be sent:', emailError.message);
    }
  } else {
    console.warn('Email configuration is missing; skipping verification email');
  }

  res.status(201).json({
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
    token
  });
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (user && (await bcrypt.compare(password, user.password))) {
    const token = generateToken(user);
    return res.json({
      user: { id: user._id, name: user.name, email: user.email, role: user.role, verified: user.verified },
      token
    });
  }

  res.status(401);
  throw new Error('Invalid email or password');
};

export const resetPasswordRequest = async (req, res) => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!email) {
    res.status(400);
    throw new Error('Email is required');
  }
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    res.status(503);
    throw new Error('Password reset email is temporarily unavailable. Please try again later.');
  }

  const user = await User.findOne({ email });
  if (user) {
    const resetToken = randomBytes(32).toString('hex');
    user.passwordResetToken = createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    const clientUrl = (process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173')
      .split(',')[0]
      .trim()
      .replace(/\/+$/, '');
    const resetUrl = `${clientUrl}/reset-password/${resetToken}`;

    try {
      await sendEmail({
        to: email,
        subject: 'Reset your StayNest AI password',
        text: `We received a request to reset your password. This link expires in 15 minutes and can only be used once:\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`
      });
    } catch (emailError) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();
      console.error('Password reset email could not be sent:', emailError.message);
      res.status(503);
      throw new Error('Password reset email could not be sent. Please try again later.');
    }
  }

  res.json({ message: 'If an account exists for that email, a password reset link has been sent.' });
};

export const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;
  if (typeof password !== 'string' || password.length < 8) {
    res.status(400);
    throw new Error('Password must be at least 8 characters long');
  }

  const hashedToken = createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: new Date() }
  });
  if (!user) {
    res.status(400);
    throw new Error('This password reset link is invalid or has expired');
  }

  const hashedPassword = await bcrypt.hash(password, saltRounds);
  const updatedUser = await User.findOneAndUpdate(
    {
      _id: user._id,
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() }
    },
    {
      $set: { password: hashedPassword },
      $inc: { tokenVersion: 1 },
      $unset: { passwordResetToken: '', passwordResetExpires: '' }
    },
    { new: true, runValidators: true }
  );
  if (!updatedUser) {
    res.status(400);
    throw new Error('This password reset link is invalid or has expired');
  }

  res.json({ message: 'Password reset successfully. Please sign in with your new password.' });
};

export const verifyEmail = async (req, res) => {
  const { token } = req.body;
  const secret = process.env.JWT_SECRET || 'staynest-ai-local-secret';
  const decoded = jwt.verify(token, secret);
  const user = await User.findById(decoded.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  user.verified = true;
  await user.save();
  res.json({ message: 'Email verified successfully' });
};

const googleClientID = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleCallbackURL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback';

if (googleClientID && googleClientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: googleClientID,
        clientSecret: googleClientSecret,
        callbackURL: googleCallbackURL
      },
      async (accessToken, refreshToken, profile, done) => {
        const existingUser = await User.findOne({ googleId: profile.id });
        if (existingUser) return done(null, existingUser);

        const user = await User.create({
          name: profile.displayName,
          email: profile.emails[0].value,
          googleId: profile.id,
          verified: true,
          role: 'student'
        });
        done(null, user);
      }
    )
  );
}

export const googleAuth = (req, res, next) => {
  if (!googleClientID || !googleClientSecret) {
    return res.status(501).json({ message: 'Google auth is not configured' });
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
};

export const googleAuthCallback = async (req, res) => {
  if (!req.user) {
    return res.status(501).json({ message: 'Google auth is not configured' });
  }
  const token = generateToken(req.user);
  res.redirect(`${process.env.CLIENT_URL}/oauth-success?token=${token}`);
};
