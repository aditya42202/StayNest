import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { normalizeRole } from '../utils/roles.js';
import { getJWTSecret } from '../utils/generateToken.js';

export const protect = async (req, res, next) => {
  const authorization = req.headers.authorization;
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token provided');
  }

  let decoded;
  try {
    decoded = jwt.verify(token, getJWTSecret());
  } catch (error) {
    res.status(401);
    throw new Error('Not authorized, token failed');
  }

  if (!decoded.id) {
    res.status(401);
    throw new Error('Not authorized, token failed');
  }

  req.user = await User.findById(decoded.id);
  if (!req.user || (decoded.tokenVersion || 0) !== (req.user.tokenVersion || 0)) {
    res.status(401);
    throw new Error('Not authorized, token failed');
  }
  if (req.user.blocked) {
    res.status(403);
    throw new Error('Forbidden: account has been blocked');
  }
  if (req.user.emailVerificationRequired && !req.user.verified) {
    res.status(403);
    throw new Error('Please verify your email address before continuing');
  }

  req.user.role = normalizeRole(req.user.role);
  next();
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    const normalizedRoles = roles.map(normalizeRole);
    const userRole = normalizeRole(req.user?.role);
    if (!req.user || !normalizedRoles.includes(userRole)) {
      res.status(403);
      throw new Error('Forbidden: insufficient permissions');
    }
    next();
  };
};
