import { rateLimit } from 'express-rate-limit';

const createLimiter = (windowMs, limit, message) => rateLimit({
  windowMs,
  limit,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message }
});

export const loginLimiter = createLimiter(
  15 * 60 * 1000,
  10,
  'Too many sign-in attempts. Please try again later.'
);
export const registrationLimiter = createLimiter(
  60 * 60 * 1000,
  5,
  'Too many registration attempts. Please try again later.'
);
export const passwordResetLimiter = createLimiter(
  60 * 60 * 1000,
  5,
  'Too many password reset attempts. Please try again later.'
);
export const verificationLimiter = createLimiter(
  15 * 60 * 1000,
  5,
  'Too many verification attempts. Please try again later.'
);
export const resendVerificationLimiter = createLimiter(
  60 * 60 * 1000,
  3,
  'Too many verification emails requested. Please try again later.'
);
export const refreshLimiter = createLimiter(
  60 * 1000,
  30,
  'Too many session refresh requests. Please try again later.'
);
