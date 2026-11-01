import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tokenHash: { type: String, required: true, select: false },
  tokenVersion: { type: Number, required: true },
  expiresAt: { type: Date, required: true }
}, { timestamps: true });

refreshTokenSchema.index({ tokenHash: 1 }, { unique: true });
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);
export default RefreshToken;
