import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';
import PendingRegistration from '../models/PendingRegistration.js';
import RefreshToken from '../models/RefreshToken.js';
import {
  REFRESH_COOKIE_NAME,
  clearRefreshCookie,
  hashRefreshToken,
  issueAuthSession,
  revokeAuthSession
} from '../utils/authSession.js';
import {
  hashEmailVerificationCode,
  isValidEmail,
  isValidPassword,
  matchesEmailVerificationCode,
  normalizeEmail
} from '../utils/authSecurity.js';
import {
  isEmailServiceConfigured,
  isTemporaryEmailFailure,
  sendEmail,
  sendVerificationEmail
} from '../utils/sendEmail.js';
import { canonicalRole, normalizeRole } from '../utils/roles.js';

const saltRounds = 12;
const verificationTokenLifetimeMinutes = Number(process.env.EMAIL_VERIFICATION_TOKEN_TTL_MINUTES || 30);
const verificationResendCooldownSeconds = Number(process.env.EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS || 60);
if (!Number.isInteger(verificationTokenLifetimeMinutes) || verificationTokenLifetimeMinutes < 1) {
  throw new Error('EMAIL_VERIFICATION_TOKEN_TTL_MINUTES must be a positive integer');
}
if (!Number.isInteger(verificationResendCooldownSeconds) || verificationResendCooldownSeconds < 1) {
  throw new Error('EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS must be a positive integer');
}
const verificationLinkLifetimeMs = verificationTokenLifetimeMinutes * 60 * 1000;
const verificationResendCooldownMs = verificationResendCooldownSeconds * 1000;
const maxVerificationAttempts = 5;

const authUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: normalizeRole(user.role),
  verified: user.verified
});

const logEmailDeliveryFailure = (operation, error) => {
  const details = {
    name: error instanceof Error ? error.name : 'UnknownError'
  };
  if (typeof error?.code === 'string') details.code = error.code;
  if (Number.isInteger(error?.responseCode)) details.responseCode = error.responseCode;
  console.error(JSON.stringify({ event: operation, ...details }));
};

const getClientUrl = () => (
  (process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')[0]
    .trim()
    .replace(/\/+$/, '')
);

export const registerUser = async (req, res) => {
  const { name, email, password, role } = req.body || {};
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
  if (!isValidEmail(normalizedEmail) || !/^[^@\s]+@gmail\.com$/.test(normalizedEmail)) {
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

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    res.status(409);
    throw new Error('Email already registered. Sign in to request a new verification email if your account is unverified.');
  }
  const pendingRegistration = await PendingRegistration.findOne({
    email: normalizedEmail,
    expiresAt: { $gt: new Date() }
  });
  if (pendingRegistration) {
    res.status(409);
    throw new Error('Email verification is pending. Open the verification page to request a new email.');
  }
  await PendingRegistration.deleteOne({
    email: normalizedEmail,
    expiresAt: { $lte: new Date() }
  });
  if (!isEmailServiceConfigured()) {
    res.status(503);
    throw new Error('Email verification is not configured. Please try again later.');
  }

  const hashedPassword = await bcrypt.hash(password, saltRounds);
  const verificationToken = randomBytes(32).toString('hex');
  const verificationTokenHash = createHash('sha256').update(verificationToken).digest('hex');
  let pending;
  try {
    pending = await PendingRegistration.create({
      name: normalizedName,
      email: normalizedEmail,
      password: hashedPassword,
      role: requestedRole,
      verificationTokenHash,
      expiresAt: new Date(Date.now() + verificationLinkLifetimeMs),
      purgeAt: new Date(Date.now() + verificationLinkLifetimeMs + 24 * 60 * 60 * 1000),
      resendAfter: new Date(Date.now() + verificationResendCooldownMs)
    });
  } catch (error) {
    if (error?.code === 11000) {
      const registeredUser = await User.exists({ email: normalizedEmail });
      res.status(409);
      throw new Error(registeredUser
        ? 'Email already registered. Sign in to request a new verification email if your account is unverified.'
        : 'Email verification is pending. Open the verification page to request a new email.');
    }
    throw error;
  }

  const verificationUrl = `${getClientUrl()}/verify-email?token=${verificationToken}`;
  try {
    await sendVerificationEmail({
      to: normalizedEmail,
      verificationUrl,
      token: verificationToken
    });
  } catch (emailError) {
    await PendingRegistration.updateOne(
      {
        _id: pending._id,
        verificationTokenHash,
        verificationClaimed: { $ne: true }
      },
      { $set: { resendAfter: new Date() } }
    );
    logEmailDeliveryFailure('Verification email delivery', emailError);
    res.status(isTemporaryEmailFailure(emailError) ? 503 : 502);
    throw new Error(isTemporaryEmailFailure(emailError)
      ? 'Your signup is pending email verification, but email delivery is temporarily unavailable. Please try again later.'
      : 'Your signup is pending email verification, but email delivery failed. Please try again later.');
  }

  res.status(201).json({
    message: 'Signup received. Verify your email to finish creating your account.',
    verificationRequired: true,
    email: pending.email
  });
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body || {};
  const normalizedEmail = normalizeEmail(email);
  if (!isValidEmail(normalizedEmail)) {
    res.status(400);
    throw new Error('Please enter a valid email address');
  }
  if (!isValidPassword(password)) {
    res.status(400);
    throw new Error('Password must be at least 8 characters and no more than 72 UTF-8 bytes');
  }
  const user = await User.findOne({ email: normalizedEmail }).select('+password');

  if (user && user.password && (await bcrypt.compare(password, user.password))) {
    if (user.blocked) {
      res.status(403);
      throw new Error('This account has been blocked');
    }
    if (!user.verified) {
      res.status(403);
      throw new Error('Please verify your email address before signing in');
    }
    const token = await issueAuthSession(user, res);
    return res.json({
      user: authUser(user),
      token
    });
  }
  if (!user) {
    const pending = await PendingRegistration.findOne({
      email: normalizedEmail,
      expiresAt: { $gt: new Date() }
    }).select('+password');
    if (pending && await bcrypt.compare(password, pending.password)) {
      res.status(403);
      throw new Error('Please verify your email address before signing in');
    }
  }

  res.status(401);
  throw new Error('Invalid email or password');
};

export const resetPasswordRequest = async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  if (!isValidEmail(email)) {
    res.status(400);
    throw new Error('Please enter a valid email address');
  }
  if (!isEmailServiceConfigured()) {
    res.status(503);
    throw new Error('Password reset email is not configured. Please try again later.');
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
      }, { idempotencyKey: resetToken });
    } catch (emailError) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();
      logEmailDeliveryFailure('Password reset email delivery', emailError);
      res.status(isTemporaryEmailFailure(emailError) ? 503 : 502);
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
  const email = normalizeEmail(req.body?.email);
  const { code, token } = req.body || {};
  const isLinkVerification = typeof token === 'string';
  if (!isLinkVerification && (!isValidEmail(email) || typeof code !== 'string')) {
    res.status(400);
    throw new Error('A verification link or email and six-digit verification code are required');
  }

  if (isLinkVerification) {
    if (!/^[a-f\d]{64}$/i.test(token)) {
      res.status(400);
      throw new Error('Verification link is invalid, expired, or has already been used');
    }

    const tokenHash = createHash('sha256').update(token).digest('hex');
    const now = new Date();
    const pendingRecord = await PendingRegistration.findOne({
      verificationTokenHash: tokenHash
    });
    if (pendingRecord && pendingRecord.expiresAt <= now) {
      res.status(410);
      throw new Error('Verification link has expired. Request a new verification email.');
    }

    const pendingRegistration = await PendingRegistration.findOneAndUpdate(
      {
        verificationTokenHash: tokenHash,
        expiresAt: { $gt: now },
        verificationClaimed: { $ne: true }
      },
      { $set: { verificationClaimed: true } },
      { new: true, runValidators: true }
    ).select('+password +verificationTokenHash');

    if (pendingRegistration) {
      try {
        await User.create({
          name: pendingRegistration.name,
          email: pendingRegistration.email,
          password: pendingRegistration.password,
          role: pendingRegistration.role,
          verified: true,
          emailVerificationRequired: false
        });
      } catch (error) {
        if (error?.code === 11000) {
          await PendingRegistration.deleteOne({ _id: pendingRegistration._id });
          res.status(400);
          throw new Error('Verification link is invalid, expired, or has already been used');
        }
        await PendingRegistration.updateOne(
          { _id: pendingRegistration._id, verificationClaimed: true },
          { $set: { verificationClaimed: false } }
        );
        throw error;
      }

      await PendingRegistration.deleteOne({
        _id: pendingRegistration._id,
        verificationTokenHash: tokenHash
      });
      return res.json({ message: 'Email verified successfully. Your account is ready to sign in.' });
    }

    const legacyUser = await User.findOne({
      emailVerificationCodeHash: tokenHash,
      emailVerificationRequired: true,
      verified: false
    }).select('+emailVerificationExpires');
    if (
      legacyUser
      && (!legacyUser.emailVerificationExpires || legacyUser.emailVerificationExpires <= now)
    ) {
      res.status(410);
      throw new Error('Verification link has expired. Request a new verification email.');
    }

    const user = await User.findOneAndUpdate(
      {
        emailVerificationCodeHash: tokenHash,
        emailVerificationRequired: true,
        verified: false,
        emailVerificationExpires: { $gt: now }
      },
      {
        $set: { verified: true, emailVerificationRequired: false, emailVerificationAttempts: 0 },
        $unset: {
          emailVerificationCodeHash: '',
          emailVerificationSalt: '',
          emailVerificationExpires: '',
          emailVerificationResendAfter: ''
        }
      },
      { new: true, runValidators: true }
    );
    if (!user) {
      res.status(400);
      throw new Error('Verification link is invalid, expired, or has already been used');
    }
    return res.json({ message: 'Email verified successfully' });
  }

  const user = await User.findOne({ email, emailVerificationRequired: true, verified: false })
    .select('+emailVerificationCodeHash +emailVerificationSalt +emailVerificationExpires');

  if (!user) {
    res.status(400);
    throw new Error('Verification link or code is invalid, expired, or has already been used');
  }

  if (!user.emailVerificationExpires || user.emailVerificationExpires <= new Date()) {
    user.emailVerificationCodeHash = undefined;
    user.emailVerificationSalt = undefined;
    user.emailVerificationExpires = undefined;
    user.emailVerificationResendAfter = undefined;
    user.emailVerificationAttempts = 0;
    await user.save();
    res.status(410);
    throw new Error('Verification code has expired. Request a new verification email.');
  }

  if (
    user.emailVerificationAttempts >= maxVerificationAttempts ||
    !matchesEmailVerificationCode(email, code, user.emailVerificationSalt, user.emailVerificationCodeHash)
  ) {
    user.emailVerificationAttempts += 1;
    if (user.emailVerificationAttempts >= maxVerificationAttempts) {
      user.emailVerificationCodeHash = undefined;
      user.emailVerificationSalt = undefined;
      user.emailVerificationExpires = undefined;
      user.emailVerificationResendAfter = undefined;
      user.emailVerificationAttempts = 0;
    }
    await user.save();
    res.status(400);
    throw new Error('Verification link or code is invalid, expired, or has already been used');
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

export const resendVerificationEmail = async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  if (!isValidEmail(email)) {
    res.status(400);
    throw new Error('Please enter a valid email address');
  }
  if (!isEmailServiceConfigured()) {
    res.status(503);
    throw new Error('Email verification is not configured. Please try again later.');
  }

  const now = new Date();
  const retryAfter = new Date(now.getTime() + verificationResendCooldownMs);
  const verificationToken = randomBytes(32).toString('hex');
  const user = await User.findOneAndUpdate(
    {
      email,
      verified: false,
      $or: [
        { emailVerificationResendAfter: { $exists: false } },
        { emailVerificationResendAfter: { $lte: now } }
      ]
    },
    {
      $set: {
        emailVerificationRequired: true,
        emailVerificationCodeHash: createHash('sha256').update(verificationToken).digest('hex'),
        emailVerificationExpires: new Date(now.getTime() + verificationLinkLifetimeMs),
        emailVerificationResendAfter: retryAfter,
        emailVerificationAttempts: 0
      },
      $unset: { emailVerificationSalt: '' }
    },
    { new: true, runValidators: true }
  );
  if (user) {
    const verificationUrl = `${getClientUrl()}/verify-email?token=${verificationToken}`;
    try {
      await sendVerificationEmail({
        to: email,
        verificationUrl,
        token: verificationToken
      });
    } catch (emailError) {
      await User.updateOne(
        { _id: user._id, emailVerificationResendAfter: retryAfter },
        {
          $unset: {
            emailVerificationCodeHash: '',
            emailVerificationExpires: '',
            emailVerificationResendAfter: ''
          },
          $set: { emailVerificationAttempts: 0 }
        }
      );
      logEmailDeliveryFailure('Verification email delivery', emailError);
      res.status(isTemporaryEmailFailure(emailError) ? 503 : 502);
      throw new Error('The verification email could not be sent. Please wait briefly, then request another link.');
    }
  } else {
    const pendingToken = randomBytes(32).toString('hex');
    const pendingRegistration = await PendingRegistration.findOneAndUpdate(
      {
        email,
        resendAfter: { $lte: now },
        verificationClaimed: { $ne: true }
      },
      {
        $set: {
          verificationTokenHash: createHash('sha256').update(pendingToken).digest('hex'),
          expiresAt: new Date(now.getTime() + verificationLinkLifetimeMs),
          purgeAt: new Date(now.getTime() + verificationLinkLifetimeMs + 24 * 60 * 60 * 1000),
          resendAfter: retryAfter
        }
      },
      { new: true, runValidators: true }
    );
    if (pendingRegistration) {
      const verificationUrl = `${getClientUrl()}/verify-email?token=${pendingToken}`;
      try {
        await sendVerificationEmail({
          to: email,
          verificationUrl,
          token: pendingToken
        });
      } catch (emailError) {
        await PendingRegistration.updateOne(
          {
            _id: pendingRegistration._id,
            resendAfter: retryAfter,
            verificationClaimed: { $ne: true }
          },
          { $set: { resendAfter: new Date() } }
        );
        logEmailDeliveryFailure('Verification email delivery', emailError);
        res.status(isTemporaryEmailFailure(emailError) ? 503 : 502);
        throw new Error('The verification email could not be sent. Please wait briefly, then request another link.');
      }
    }
  }

  res.json({
    message: `If an unverified account exists and is eligible for a resend, a verification link will be sent. Please wait ${verificationResendCooldownSeconds} seconds before trying again.`
  });
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
  if (!user.verified) {
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
