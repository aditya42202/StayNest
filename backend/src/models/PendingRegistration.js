import mongoose from 'mongoose';

const pendingRegistrationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  email: { type: String, required: true, trim: true, lowercase: true, unique: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['user', 'student', 'owner', 'admin'], default: 'user' },
  verificationTokenHash: { type: String, required: true, select: false },
  verificationClaimed: { type: Boolean, default: false, select: false },
  expiresAt: { type: Date, required: true },
  purgeAt: { type: Date, required: true, expires: 0 },
  resendAfter: { type: Date, required: true }
});

const PendingRegistration = mongoose.model('PendingRegistration', pendingRegistrationSchema);
export default PendingRegistration;
