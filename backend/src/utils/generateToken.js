import jwt from 'jsonwebtoken';

export const getJWTSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'JWT_SECRET is missing or too short. Set it in backend/.env to a unique random secret of at least 32 characters.'
    );
  }
  return secret;
};

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, email: user.email, tokenVersion: user.tokenVersion || 0 },
    getJWTSecret(),
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' }
  );
};

export default generateToken;
