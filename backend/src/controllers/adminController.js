import User from '../models/User.js';
import Property from '../models/Property.js';
import Booking from '../models/Booking.js';
import Payment from '../models/Payment.js';
import Review from '../models/Review.js';

export const getAdminDashboard = async (req, res) => {
  const userCount = await User.countDocuments();
  const ownerCount = await User.countDocuments({ role: 'owner' });
  const propertyCount = await Property.countDocuments();
  const bookingCount = await Booking.countDocuments();

  res.json({ userCount, ownerCount, propertyCount, bookingCount });
};

export const getAllUsers = async (req, res) => {
  const users = await User.find().select('-password').sort({ createdAt: -1 });
  res.json({ users });
};

export const getAllProperties = async (req, res) => {
  const properties = await Property.find().populate('owner', 'name email').sort({ createdAt: -1 });
  res.json({ properties });
};

export const getAllBookings = async (req, res) => {
  const bookings = await Booking.find()
    .populate('student', 'name email')
    .populate('owner', 'name email')
    .populate('property', 'title city area')
    .populate('room', 'name type')
    .sort({ createdAt: -1 });
  res.json({ bookings });
};

export const updatePropertyVerification = async (req, res) => {
  const property = await Property.findById(req.params.id);
  if (!property) {
    res.status(404);
    throw new Error('Property not found');
  }
  property.verified = req.body.verified;
  await property.save();
  res.json(property);
};

export const updateUserStatus = async (req, res) => {
  const { blocked } = req.body;
  if (typeof blocked !== 'boolean') {
    res.status(400);
    throw new Error('blocked must be true or false');
  }
  const user = await User.findById(req.params.id).select('-password');
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  if (user._id.toString() === req.user._id.toString()) {
    res.status(400);
    throw new Error('Administrators cannot block their own account');
  }
  user.blocked = blocked;
  await user.save();
  res.json(user);
};

export const updateOwnerVerification = async (req, res) => {
  const { verified } = req.body;
  if (typeof verified !== 'boolean') {
    res.status(400);
    throw new Error('verified must be true or false');
  }
  const owner = await User.findOne({ _id: req.params.id, role: { $in: ['owner'] } });
  if (!owner) {
    res.status(404);
    throw new Error('Owner not found');
  }
  owner.verified = verified;
  await owner.save();
  res.json(owner);
};

export const getAllPayments = async (req, res) => {
  const payments = await Payment.find().populate('user', 'name email').populate('booking').sort({ createdAt: -1 });
  res.json({ payments });
};

export const getAllReviews = async (req, res) => {
  const reviews = await Review.find().populate('user', 'name email').populate('property', 'title').sort({ createdAt: -1 });
  res.json({ reviews });
};

export const deleteReview = async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) {
    res.status(404);
    throw new Error('Review not found');
  }
  await Property.findByIdAndUpdate(review.property, { $pull: { reviews: review._id } });
  await review.deleteOne();
  res.json({ message: 'Review removed successfully' });
};
