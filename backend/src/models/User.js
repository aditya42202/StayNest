import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  passwordResetToken: { type: String, select: false },
  passwordResetExpires: { type: Date, select: false },
  tokenVersion: { type: Number, default: 0 },
  role: { type: String, enum: ['student', 'owner', 'admin'], default: 'student' },
  phone: { type: String },
  verified: { type: Boolean, default: false },
  googleId: { type: String },
  avatar: { type: String },
  preferences: {
    budget: { type: Number, default: 0 },
    city: { type: String },
    categories: [{ type: String }]
  },
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Property' }],
  properties: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Property' }],
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
export default User;
