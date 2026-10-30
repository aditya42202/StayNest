import Booking from '../models/Booking.js';
import Property from '../models/Property.js';
import Room from '../models/Room.js';

export const getOwnerDashboard = async (req, res) => {
  const propertyCount = await Property.countDocuments({ owner: req.user._id });
  const bookingCount = await Booking.countDocuments({ owner: req.user._id });
  const earnings = await Booking.aggregate([
    { $match: { owner: req.user._id, paymentStatus: 'paid' } },
    { $group: { _id: null, total: { $sum: '$totalPrice' } } }
  ]);

  res.json({ propertyCount, bookingCount, earnings: earnings[0]?.total || 0 });
};

export const getOwnerProperties = async (req, res) => {
  const properties = await Property.find({ owner: req.user._id }).sort({ createdAt: -1 });
  res.json({ properties });
};

export const getOwnerBookingRequests = async (req, res) => {
  const requests = await Booking.find({ owner: req.user._id, status: 'pending' })
    .populate('student', 'name email phone')
    .populate('property', 'title city area');
  res.json({ requests });
};

export const getOwnerBookings = async (req, res) => {
  const bookings = await Booking.find({ owner: req.user._id })
    .populate('student', 'name email phone')
    .populate('property', 'title city area')
    .populate('room', 'name type price')
    .sort({ createdAt: -1 });
  res.json({ bookings });
};

export const verifyBookingRequest = async (req, res) => {
  const { status, checkIn, checkOut } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    res.status(400);
    throw new Error('Booking status must be approved or rejected');
  }

  const booking = await Booking.findById(req.params.id);
  if (!booking || booking.owner.toString() !== req.user._id.toString()) {
    res.status(404);
    throw new Error('Booking request not found');
  }
  if (booking.status !== 'pending') {
    res.status(400);
    throw new Error('Only pending booking requests can be reviewed');
  }

  if (status === 'approved') {
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    if (
      !checkIn ||
      !checkOut ||
      Number.isNaN(checkInDate.getTime()) ||
      Number.isNaN(checkOutDate.getTime()) ||
      checkOutDate <= checkInDate ||
      checkInDate < new Date(new Date().setUTCHours(0, 0, 0, 0))
    ) {
      res.status(400);
      throw new Error('Choose a valid future check-in date and a check-out date after check-in');
    }

    const property = await Property.findById(booking.property);
    if (!property) {
      res.status(404);
      throw new Error('Property not found for this booking');
    }
    const room = booking.room
      ? await Room.findOne({ _id: booking.room, property: property._id })
      : null;
    const nights = Math.ceil((checkOutDate - checkInDate) / (24 * 60 * 60 * 1000));
    booking.checkIn = checkInDate;
    booking.checkOut = checkOutDate;
    booking.totalPrice = Math.ceil(nights / 30) * (room?.price || property.rent);
  }

  booking.status = status;
  await booking.save();
  res.json(booking);
};
