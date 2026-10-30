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

const Booking = mongoose.model('Booking', bookingSchema);
export default Booking;
