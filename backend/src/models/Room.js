import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['single', 'double', 'shared', 'suite'], default: 'single' },
  price: { type: Number, required: true },
  available: { type: Boolean, default: true },
  bedCount: { type: Number, default: 1 },
  floor: { type: String },
  amenities: [{ type: String }],
  occupantLimit: { type: Number, default: 1 },
  createdAt: { type: Date, default: Date.now }
});

const Room = mongoose.model('Room', roomSchema);
export default Room;
