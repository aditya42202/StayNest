import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token provided');
  }

  try {
    const secret = process.env.JWT_SECRET || 'staynest-ai-local-secret';
    const decoded = jwt.verify(token, secret);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user || (decoded.tokenVersion || 0) !== (req.user.tokenVersion || 0)) {
      res.status(401);
      throw new Error('Not authorized, token failed');
    }
    next();
  } catch (error) {
    res.status(401);
    throw new Error('Not authorized, token failed');
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403);
      throw new Error('Forbidden: insufficient permissions');
    }
    next();
  };
};
