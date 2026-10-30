import mongoose from 'mongoose';

const propertySchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  category: { type: String, enum: ['boys pg', 'girls pg', 'hostel', 'shared room', 'private room', 'flat', 'house'], required: true },
  type: { type: String, default: 'PG' },
  city: { type: String, required: true },
  area: { type: String, required: true },
  college: { type: String },
  landmark: { type: String },
  address: { type: String, required: true },
  rent: { type: Number, required: true },
  rentPerDay: { type: Number, min: 0 },
  rentPerHour: { type: Number, min: 0 },
  deposit: { type: Number, default: 0 },
  images: [{ type: String }],
  videos: [{ type: String }],
  rooms: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Room' }],
  amenities: [{ type: String }],
  mapLocation: {
    lat: { type: Number },
    lng: { type: Number }
  },
  available: { type: Boolean, default: true },
  verified: { type: Boolean, default: false },
  safetyScore: { type: Number, default: 0 },
  rating: { type: Number, default: 0 },
  reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Review' }],
  createdAt: { type: Date, default: Date.now }
});

propertySchema.index({ title: 'text', description: 'text', city: 'text', area: 'text', college: 'text', landmark: 'text' });

const Property = mongoose.model('Property', propertySchema);
export default Property;
