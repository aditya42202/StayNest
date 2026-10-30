import Stripe from 'stripe';
import Payment from '../models/Payment.js';
import Booking from '../models/Booking.js';
import { addBillingPeriod } from '../utils/rentalPricing.js';

const getStripeClient = (res) => {
  if (!process.env.STRIPE_SECRET_KEY) {
    res.status(503);
    throw new Error('Online payments are not configured');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY);
};

const getClientUrl = () => (process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')[0]
  .trim()
  .replace(/\/+$/, '');

const completeCheckoutPayment = async (session) => {
  if (session.payment_status !== 'paid') return null;

  const { bookingId, userId } = session.metadata || {};
  if (!bookingId || !userId) return null;

  const pendingPayment = await Payment.findOne({ booking: bookingId, user: userId, transactionId: session.id });
  if (!pendingPayment) return null;

  const payment = await Payment.findOneAndUpdate(
    { _id: pendingPayment._id, status: 'pending' },
    { $set: { status: 'completed' } },
    { new: true }
  );
  const booking = await Booking.findOne({ _id: bookingId, student: userId });
  if (!booking) return null;
  if (!payment) return { payment: pendingPayment, booking };

  booking.amountPaid = Math.min(booking.totalPrice, (booking.amountPaid || 0) + payment.amount);
  const remaining = Math.max(0, Math.round((booking.totalPrice - booking.amountPaid) * 100) / 100);
  if (remaining === 0) {
    booking.paymentStatus = 'paid';
    booking.nextPaymentAmount = 0;
    booking.nextPaymentDueAt = undefined;
  } else {
    booking.paymentStatus = 'partial';
    booking.nextPaymentAmount = Math.min(booking.installmentRate, remaining);
    booking.nextPaymentDueAt = addBillingPeriod(booking.nextPaymentDueAt || booking.checkIn, booking.billingUnit);
  }
  await booking.save();

  return { payment, booking };
};

export const createCheckoutSession = async (req, res) => {
  const stripe = getStripeClient(res);
  const { bookingId } = req.body;

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  if (booking.student.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('You can only pay for your own bookings');
  }
  if (booking.status !== 'approved') {
    res.status(400);
    throw new Error('Payment is available after the owner approves your booking');
  }
  if (booking.paymentStatus === 'paid') {
    res.status(400);
    throw new Error('This booking has already been paid');
  }
  if (
    booking.paymentPlan === 'installments'
    && (booking.amountPaid || 0) > 0
    && booking.nextPaymentDueAt
    && booking.nextPaymentDueAt > new Date()
  ) {
    res.status(400);
    throw new Error(`Your next installment is due on ${booking.nextPaymentDueAt.toLocaleDateString()}`);
  }
  const remaining = Math.max(0, booking.totalPrice - (booking.amountPaid || 0));
  const amount = booking.paymentPlan === 'installments'
    ? Math.min(booking.nextPaymentAmount || booking.installmentRate, remaining)
    : remaining;
  if (!Number.isFinite(amount) || amount <= 0) {
    res.status(400);
    throw new Error('There is no outstanding amount for this booking');
  }

  const existingPayment = await Payment.findOne({
    booking: booking._id,
    user: req.user._id,
    method: 'stripe',
    status: 'pending',
    transactionId: { $regex: /^cs_/ }
  });
  if (existingPayment) {
    try {
      const existingSession = await stripe.checkout.sessions.retrieve(existingPayment.transactionId);
      if (existingSession.status === 'open' && existingSession.url) {
        return res.json({ url: existingSession.url, sessionId: existingSession.id });
      }
      if (existingSession.payment_status === 'paid') {
        const result = await completeCheckoutPayment(existingSession);
        return res.status(409).json({
          message: result?.booking?.paymentStatus === 'paid' ? 'This booking has already been paid' : 'The previous installment was paid',
          paymentStatus: result?.booking?.paymentStatus
        });
      }
    } catch (sessionError) {
      console.warn('Pending checkout session could not be reused:', sessionError.message);
    }
    existingPayment.status = 'failed';
    await existingPayment.save();
  }

  const clientUrl = getClientUrl();
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: req.user.email,
    line_items: [{
      price_data: {
        currency: 'inr',
        product_data: { name: 'StayNest rent payment' },
        unit_amount: Math.round(amount * 100)
      },
      quantity: 1
    }],
    metadata: { bookingId: booking._id.toString(), userId: req.user._id.toString() },
    success_url: `${clientUrl}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${clientUrl}/dashboard?payment=cancelled`
  });

  const payment = await Payment.create({
    booking: booking._id,
    user: req.user._id,
    amount,
    method: 'stripe',
    status: 'pending',
    transactionId: session.id
  });

  res.json({ url: session.url, sessionId: session.id, paymentId: payment._id });
};

export const confirmCheckoutSession = async (req, res) => {
  const stripe = getStripeClient(res);
  const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
  if (session.metadata?.userId !== req.user._id.toString()) {
    res.status(403);
    throw new Error('You can only confirm your own payment');
  }

  const result = await completeCheckoutPayment(session);
  const booking = result?.booking || await Booking.findOne({ _id: session.metadata?.bookingId, student: req.user._id });
  res.json({
    bookingId: booking?._id || session.metadata?.bookingId,
    paymentStatus: booking?.paymentStatus || 'unpaid',
    amountPaid: booking?.amountPaid || 0,
    nextPaymentAmount: booking?.nextPaymentAmount || 0,
    nextPaymentDueAt: booking?.nextPaymentDueAt
  });
};

export const handleStripeWebhook = async (req, res) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return res.status(503).json({ message: 'Stripe webhook is not configured' });
  }

  let event;
  try {
    event = getStripeClient(res).webhooks.constructEvent(req.body, req.headers['stripe-signature'], webhookSecret);
  } catch (error) {
    return res.status(400).send(`Webhook signature verification failed: ${error.message}`);
  }

  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    await completeCheckoutPayment(event.data.object);
  } else if (event.type === 'checkout.session.expired') {
    await Payment.findOneAndUpdate(
      { transactionId: event.data.object.id, status: 'pending' },
      { $set: { status: 'failed' } }
    );
  }

  res.json({ received: true });
};

export const getPaymentHistory = async (req, res) => {
  const payments = await Payment.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json({ payments });
};
