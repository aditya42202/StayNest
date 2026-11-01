import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  checkIn: { type: Date },
  checkOut: { type: Date },
  billingUnit: { type: String, enum: ['hour', 'day', 'month', 'year'], default: 'month' },
  paymentPlan: { type: String, enum: ['upfront', 'installments'], default: 'upfront' },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending' },
  totalPrice: { type: Number, required: true },
  amountPaid: { type: Number, default: 0, min: 0 },
  installmentRate: { type: Number, default: 0, min: 0 },
  nextPaymentAmount: { type: Number, default: 0, min: 0 },
  nextPaymentDueAt: { type: Date },
  paymentStatus: { type: String, enum: ['unpaid', 'partial', 'paid', 'refunded'], default: 'unpaid' },
  invoiceUrl: { type: String },
  createdAt: { type: Date, default: Date.now }
});

bookingSchema.index({ property: 1, room: 1, status: 1, checkIn: 1, checkOut: 1 });
bookingSchema.index({ student: 1, createdAt: -1 });
bookingSchema.index({ owner: 1, status: 1, createdAt: -1 });

const Booking = mongoose.model('Booking', bookingSchema);
export default Booking;
