import User from '../models/User.js';
import Property from '../models/Property.js';
import Booking from '../models/Booking.js';

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
