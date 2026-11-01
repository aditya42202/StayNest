import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';
import RefreshToken from '../models/RefreshToken.js';
import generateToken from '../utils/generateToken.js';
import {
  REFRESH_COOKIE_NAME,
  clearRefreshCookie,
  hashRefreshToken,
  issueAuthSession,
  revokeAuthSession
} from '../utils/authSession.js';
import {
  createEmailVerificationCode,
  hashEmailVerificationCode,
  isValidPassword,
  matchesEmailVerificationCode,
  normalizeEmail
} from '../utils/authSecurity.js';
import { sendEmail } from '../utils/sendEmail.js';
import { canonicalRole, normalizeRole } from '../utils/roles.js';

const saltRounds = 12;
const verificationCodeLifetimeMs = 10 * 60 * 1000;
const maxVerificationAttempts = 5;

const authUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: normalizeRole(user.role),
  verified: user.verified
});

const getClientUrl = () => (
  (process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')[0]
    .trim()
    .replace(/\/+$/, '')
);

export const registerUser = async (req, res) => {
  const { name, email, password, role } = req.body;
  const requestedRole = canonicalRole(role || 'user');
  const normalizedEmail = normalizeEmail(email);
  const normalizedName = typeof name === 'string' ? name.trim() : '';

  if (normalizedName.length < 2 || normalizedName.length > 80) {
    res.status(400);
    throw new Error('Name must be between 2 and 80 characters');
  }
  if (!isValidPassword(password)) {
    res.status(400);
    throw new Error('Password must be at least 8 characters and no more than 72 UTF-8 bytes');
  }
  if (!/^[^@\s]+@gmail\.com$/.test(normalizedEmail)) {
    res.status(400);
    throw new Error('Please use a valid @gmail.com email address');
  }
  if (!['user', 'owner', 'admin'].includes(requestedRole)) {
    res.status(400);
    throw new Error('Please select a valid account type');
  }

  if (requestedRole === 'admin') {
    const allowedAdminEmails = (process.env.ADMIN_SIGNUP_EMAILS || '')
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
    if (!allowedAdminEmails.includes(normalizedEmail)) {
      res.status(403);
      throw new Error('This email is not approved for admin signup');
    }
  }

  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    res.status(503);
    throw new Error('Email verification is temporarily unavailable. Please try again later.');
  }

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    res.status(400);
    throw new Error('Email already registered');
  }

  const hashedPassword = await bcrypt.hash(password, saltRounds);
  const verificationCode = createEmailVerificationCode();
  const verificationSalt = randomBytes(16).toString('hex');
  const user = await User.create({
    name: normalizedName,
    email: normalizedEmail,
    password: hashedPassword,
    role: requestedRole,
    emailVerificationRequired: true,
    emailVerificationCodeHash: hashEmailVerificationCode(normalizedEmail, verificationCode, verificationSalt),
    emailVerificationSalt: verificationSalt,
    emailVerificationExpires: new Date(Date.now() + verificationCodeLifetimeMs),
    emailVerificationAttempts: 0
  });

  try {
    await sendEmail({
      to: normalizedEmail,
      subject: 'Your StayNest AI verification code',
      text: `Your StayNest AI verification code is ${verificationCode}. It expires in 10 minutes.`
    });
  } catch (emailError) {
    console.error('Verification email could not be sent:', emailError.message);
    res.status(503);
    throw new Error('Your account was created, but the verification email could not be sent. Request a new code to continue.');
  }

  const token = generateToken(user);
  res.status(201).json({
    user: authUser(user),
    token,
    verificationRequired: true
  });
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: normalizeEmail(email) }).select('+password');

  const passwordFitsBcrypt = typeof password === 'string' && Buffer.byteLength(password, 'utf8') <= 72;
  if (user && user.password && passwordFitsBcrypt && (await bcrypt.compare(password, user.password))) {
    if (user.blocked) {
      res.status(403);
      throw new Error('This account has been blocked');
    }
    if (user.emailVerificationRequired && !user.verified) {
      res.status(403);
      throw new Error('Please verify your email address before signing in');
    }
    const token = await issueAuthSession(user, res);
    return res.json({
      user: authUser(user),
      token
    });
  }

  res.status(401);
  throw new Error('Invalid email or password');
};

export const resetPasswordRequest = async (req, res) => {
  const email = normalizeEmail(req.body.email);
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
  if (!isValidPassword(password)) {
    res.status(400);
    throw new Error('Password must be at least 8 characters and no more than 72 UTF-8 bytes');
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
  await RefreshToken.deleteMany({ user: updatedUser._id });

  res.json({ message: 'Password reset successfully. Please sign in with your new password.' });
};

export const verifyEmail = async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const { code } = req.body;
  if (!email || typeof code !== 'string') {
    res.status(400);
    throw new Error('Email and the six-digit verification code are required');
  }

  const user = await User.findOne({ email, emailVerificationRequired: true, verified: false })
    .select('+emailVerificationCodeHash +emailVerificationSalt +emailVerificationExpires');
  const codeIsCurrent = user
    && user.emailVerificationExpires
    && user.emailVerificationExpires > new Date()
    && user.emailVerificationAttempts < maxVerificationAttempts;

  if (!codeIsCurrent) {
    res.status(400);
    throw new Error('Verification code is invalid or has expired');
  }
  if (!matchesEmailVerificationCode(
    email,
    code,
    user.emailVerificationSalt,
    user.emailVerificationCodeHash
  )) {
    user.emailVerificationAttempts += 1;
    if (user.emailVerificationAttempts >= maxVerificationAttempts) {
      user.emailVerificationCodeHash = undefined;
      user.emailVerificationSalt = undefined;
      user.emailVerificationExpires = undefined;
      user.emailVerificationAttempts = 0;
    }
    await user.save();
    res.status(400);
    throw new Error('Verification code is invalid or has expired');
  }

  user.verified = true;
  user.emailVerificationRequired = false;
  user.emailVerificationCodeHash = undefined;
  user.emailVerificationSalt = undefined;
  user.emailVerificationExpires = undefined;
  user.emailVerificationAttempts = 0;
  await user.save();
  res.json({ message: 'Email verified successfully' });
};

export const resendVerificationCode = async (req, res) => {
  const email = normalizeEmail(req.body.email);
  if (!email) {
    res.status(400);
    throw new Error('Email is required');
  }
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    res.status(503);
    throw new Error('Email verification is temporarily unavailable. Please try again later.');
  }

  const user = await User.findOne({ email, verified: false });
  if (user) {
    const verificationCode = createEmailVerificationCode();
    const verificationSalt = randomBytes(16).toString('hex');
    user.emailVerificationRequired = true;
    user.emailVerificationCodeHash = hashEmailVerificationCode(email, verificationCode, verificationSalt);
    user.emailVerificationSalt = verificationSalt;
    user.emailVerificationExpires = new Date(Date.now() + verificationCodeLifetimeMs);
    user.emailVerificationAttempts = 0;
    await user.save();

    try {
      await sendEmail({
        to: email,
        subject: 'Your StayNest AI verification code',
        text: `Your StayNest AI verification code is ${verificationCode}. It expires in 10 minutes.`
      });
    } catch (emailError) {
      console.error('Verification email could not be sent:', emailError.message);
      res.status(503);
      throw new Error('The verification email could not be sent. Please try again later.');
    }
  }

  res.json({ message: 'If an unverified account exists for that email, a new code has been sent.' });
};

export const refreshSession = async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!token) {
    clearRefreshCookie(res);
    res.status(401);
    throw new Error('Refresh session is invalid or has expired');
  }

  const session = await RefreshToken.findOneAndDelete({
    tokenHash: hashRefreshToken(token),
    expiresAt: { $gt: new Date() }
  });
  if (!session) {
    clearRefreshCookie(res);
    res.status(401);
    throw new Error('Refresh session is invalid or has expired');
  }

  const user = await User.findById(session.user);
  if (!user || user.blocked || (user.tokenVersion || 0) !== session.tokenVersion) {
    clearRefreshCookie(res);
    res.status(401);
    throw new Error('Refresh session is invalid or has expired');
  }
  if (user.emailVerificationRequired && !user.verified) {
    clearRefreshCookie(res);
    res.status(403);
    throw new Error('Please verify your email address before continuing');
  }

  const accessToken = await issueAuthSession(user, res);
  res.json({ user: authUser(user), token: accessToken });
};

export const logoutUser = async (req, res) => {
  await revokeAuthSession(req, res);
  res.json({ message: 'Signed out successfully' });
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
        const email = normalizeEmail(profile.emails?.[0]?.value);
        if (!email) return done(new Error('Google did not provide an email address'));

        const existingUser = await User.findOne({ googleId: profile.id });
        if (existingUser) return done(null, existingUser);

        const user = await User.create({
          name: profile.displayName,
          email,
          googleId: profile.id,
          verified: true,
          role: 'user'
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
  await issueAuthSession(req.user, res);
  res.redirect(`${getClientUrl()}/oauth-success`);
};
