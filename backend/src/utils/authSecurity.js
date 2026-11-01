import { createHmac, randomInt, timingSafeEqual } from 'crypto';
import { getJWTSecret } from './generateToken.js';

export const normalizeEmail = (email) => (
  typeof email === 'string' ? email.trim().toLowerCase() : ''
);

export const isValidPassword = (password) => (
  typeof password === 'string'
  && password.length >= 8
  && Buffer.byteLength(password, 'utf8') <= 72
);

export const createEmailVerificationCode = () => (
  randomInt(0, 1_000_000).toString().padStart(6, '0')
);

export const hashEmailVerificationCode = (email, code, salt) => (
  createHmac('sha256', getJWTSecret())
    .update(`${salt}:${normalizeEmail(email)}:${code}`)
    .digest('hex')
);

export const matchesEmailVerificationCode = (email, code, salt, expectedHash) => {
  if (typeof code !== 'string' || !/^\d{6}$/.test(code) || typeof expectedHash !== 'string') {
    return false;
  }

  const expected = Buffer.from(expectedHash, 'hex');
  const actual = Buffer.from(hashEmailVerificationCode(email, code, salt), 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
};
