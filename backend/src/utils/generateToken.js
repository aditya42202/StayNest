import jwt from 'jsonwebtoken';

const generateToken = (user) => {
  const secret = process.env.JWT_SECRET || 'staynest-ai-local-secret';
  return jwt.sign(
    { id: user._id, role: user.role, email: user.email, tokenVersion: user.tokenVersion || 0 },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

export default generateToken;
