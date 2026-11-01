import { createHash, randomBytes } from 'crypto';
import RefreshToken from '../models/RefreshToken.js';
import generateToken from './generateToken.js';

export const REFRESH_COOKIE_NAME = 'staynest_refresh';

const refreshTokenLifetimeMs = 7 * 24 * 60 * 60 * 1000;

const refreshCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  path: '/api/auth'
});

export const hashRefreshToken = (token) => createHash('sha256').update(token).digest('hex');

export const issueAuthSession = async (user, res) => {
  const refreshToken = randomBytes(48).toString('base64url');
  const expiresAt = new Date(Date.now() + refreshTokenLifetimeMs);

  await RefreshToken.create({
    user: user._id,
    tokenHash: hashRefreshToken(refreshToken),
    tokenVersion: user.tokenVersion || 0,
    expiresAt
  });

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    ...refreshCookieOptions(),
    expires: expiresAt
  });

  return generateToken(user);
};

export const clearRefreshCookie = (res) => {
  res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions());
};

export const revokeAuthSession = async (req, res) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
  if (refreshToken) {
    await RefreshToken.deleteOne({ tokenHash: hashRefreshToken(refreshToken) });
  }
  clearRefreshCookie(res);
};
