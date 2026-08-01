import Stripe from 'stripe';
import Payment from '../models/Payment.js';
import Booking from '../models/Booking.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createPaymentIntent = async (req, res) => {
  const { bookingId, amount, currency = 'inr' } = req.body;

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency,
    metadata: { bookingId: booking._id.toString(), userId: req.user._id.toString() }
  });

  const payment = await Payment.create({
    booking: booking._id,
    user: req.user._id,
    amount,
    method: 'stripe',
    status: 'pending',
    transactionId: paymentIntent.id
  });

  res.json({ clientSecret: paymentIntent.client_secret, paymentId: payment._id });
};

export const getPaymentHistory = async (req, res) => {
  const payments = await Payment.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json({ payments });
};
