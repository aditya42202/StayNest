import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  passwordResetToken: { type: String, select: false },
  passwordResetExpires: { type: Date, select: false },
  tokenVersion: { type: Number, default: 0 },
  role: { type: String, enum: ['user', 'student', 'owner', 'admin'], default: 'user' },
  blocked: { type: Boolean, default: false },
  phone: { type: String },
  verified: { type: Boolean, default: false },
  googleId: { type: String },
  avatar: { type: String },
  preferences: {
    budget: { type: Number, default: 0 },
    city: { type: String },
    categories: [{ type: String }]
  },
  studentProfile: {
    college: { type: String, trim: true, maxlength: 120 },
    course: { type: String, trim: true, maxlength: 120 },
    yearOfStudy: { type: Number, min: 1, max: 10 }
  },
  ownerProfile: {
    businessName: { type: String, trim: true, maxlength: 120 },
    businessAddress: { type: String, trim: true, maxlength: 300 },
    website: { type: String, trim: true, maxlength: 200 }
  },
  adminProfile: {
    department: { type: String, trim: true, maxlength: 120 },
    designation: { type: String, trim: true, maxlength: 120 }
  },
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Property' }],
  properties: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Property' }],
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
export default User;
