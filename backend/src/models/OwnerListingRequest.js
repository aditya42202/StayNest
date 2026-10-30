import mongoose from 'mongoose';

const ownerListingRequestSchema = new mongoose.Schema({
  ownerName: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
  phone: { type: String, required: true, trim: true, maxlength: 30 },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, required: true, trim: true, maxlength: 5000 },
  category: { type: String, enum: ['boys pg', 'girls pg', 'hostel', 'shared room', 'private room', 'flat', 'house'], required: true },
  city: { type: String, required: true, trim: true, maxlength: 100 },
  area: { type: String, required: true, trim: true, maxlength: 100 },
  college: { type: String, trim: true, maxlength: 120 },
  landmark: { type: String, trim: true, maxlength: 200 },
  address: { type: String, required: true, trim: true, maxlength: 500 },
  rent: { type: Number, required: true, min: 1 },
  rentPerDay: { type: Number, min: 0 },
  rentPerHour: { type: Number, min: 0 },
  deposit: { type: Number, default: 0, min: 0 },
  amenities: [{ type: String, trim: true, maxlength: 80 }],
  images: [{ type: String, trim: true, maxlength: 2048 }],
  status: { type: String, enum: ['pending', 'processing', 'approved', 'rejected'], default: 'pending', index: true },
  property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
  reviewedAt: { type: Date }
}, { timestamps: true });

const OwnerListingRequest = mongoose.model('OwnerListingRequest', ownerListingRequestSchema);
export default OwnerListingRequest;