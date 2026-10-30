import Booking from '../models/Booking.js';
import Property from '../models/Property.js';
import Room from '../models/Room.js';

export const createBooking = async (req, res) => {
  const { propertyId, roomId } = req.body;

  const property = await Property.findById(propertyId);
  if (!property || !property.available) {
    res.status(400);
    throw new Error('Selected property is unavailable');
  }
  if (property.owner.toString() === req.user._id.toString()) {
    res.status(400);
    throw new Error('You cannot book your own property');
  }

  let room;
  if (roomId) {
    room = await Room.findOne({ _id: roomId, property: property._id, available: true });
    if (!room) {
      res.status(400);
      throw new Error('Selected room is unavailable');
    }
  }

  const monthlyRate = room?.price || property.rent;
  const booking = await Booking.create({
    property: property._id,
    room: room?._id,
    student: req.user._id,
    owner: property.owner,
    totalPrice: monthlyRate,
    paymentStatus: 'unpaid'
  });

  res.status(201).json({ booking, message: 'Booking request sent to the property owner' });
};

export const getMyBookings = async (req, res) => {
  const bookings = await Booking.find({ student: req.user._id })
    .populate('property', 'title city area rent images')
    .populate('room', 'name type price')
    .sort({ createdAt: -1 });
  res.json({ bookings });
};

export const getOwnerBookings = async (req, res) => {
  const bookings = await Booking.find({ owner: req.user._id })
    .populate('property', 'title city area rent images')
    .populate('student', 'name email phone')
    .sort({ createdAt: -1 });
  res.json({ bookings });
};

export const getBookingById = async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate('property', 'title address city area')
    .populate('room', 'name type price')
    .populate('student', 'name email')
    .populate('owner', 'name email');

  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  // Authorization: only student who made booking, owner of property, or admin can view
  const userId = req.user && req.user._id ? req.user._id.toString() : null;
  const isOwner = booking.owner && booking.owner._id ? booking.owner._id.toString() === userId : booking.owner && booking.owner.toString() === userId;
  const isStudent = booking.student && booking.student._id ? booking.student._id.toString() === userId : booking.student && booking.student.toString() === userId;
  const isAdmin = req.user && req.user.role === 'admin';

  if (!isAdmin && !isOwner && !isStudent) {
    res.status(403);
    throw new Error('Forbidden: insufficient permissions to view this booking');
  }

  res.json(booking);
};

export const updateBookingStatus = async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  const requestedStatus = req.body.status;
  const role = req.user.role === 'student' ? 'user' : req.user.role;
  const isTenant = booking.student.toString() === req.user._id.toString();
  const isOwner = booking.owner.toString() === req.user._id.toString();

  if (role === 'user') {
    if (!isTenant || requestedStatus !== 'cancelled') {
      res.status(403);
      throw new Error('Tenants can only cancel their own bookings');
    }
    if (booking.status !== 'pending') {
      res.status(400);
      throw new Error('Only pending booking requests can be cancelled');
    }
  } else if (role === 'owner') {
    if (!isOwner || !['approved', 'rejected'].includes(requestedStatus)) {
      res.status(403);
      throw new Error('Owners can only approve or reject their own booking requests');
    }
    if (booking.status !== 'pending') {
      res.status(400);
      throw new Error('Only pending booking requests can be reviewed');
    }
    if (requestedStatus === 'approved' && (!booking.checkIn || !booking.checkOut)) {
      res.status(400);
      throw new Error('Set check-in and check-out dates before approving this request');
    }
  } else if (role !== 'admin') {
    res.status(403);
    throw new Error('Forbidden: insufficient permissions');
  }

  if (requestedStatus === 'approved' && (!booking.checkIn || !booking.checkOut)) {
    res.status(400);
    throw new Error('Set check-in and check-out dates before approving this request');
  }

  booking.status = requestedStatus || booking.status;
  if (booking.status === 'approved' && booking.paymentStatus !== 'paid') booking.paymentStatus = 'paid';
  if (booking.status === 'cancelled' && booking.paymentStatus !== 'unpaid') booking.paymentStatus = 'refunded';
  await booking.save();

  res.json(booking);
};
