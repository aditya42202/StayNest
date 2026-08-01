import mongoose from 'mongoose';

const complaintSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  message: { type: String, required: true },
  status: { type: String, enum: ['open', 'in-review', 'resolved', 'closed'], default: 'open' },
  createdAt: { type: Date, default: Date.now }
});

const Complaint = mongoose.model('Complaint', complaintSchema);
export default Complaint;
