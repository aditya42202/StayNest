import Booking from '../models/Booking.js';
import Property from '../models/Property.js';
import Room from '../models/Room.js';

export const createBooking = async (req, res) => {
  const { propertyId, roomId, checkIn, checkOut, totalPrice } = req.body;

  const property = await Property.findById(propertyId);
  const room = await Room.findById(roomId);

  if (!property || !room || !room.available) {
    res.status(400);
    throw new Error('Selected room or property is unavailable');
  }

  const booking = await Booking.create({
    property: propertyId,
    room: roomId,
    student: req.user._id,
    owner: property.owner,
    checkIn,
    checkOut,
    totalPrice,
    paymentStatus: 'unpaid'
  });

  res.status(201).json(booking);
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
  res.json(booking);
};

export const updateBookingStatus = async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  booking.status = req.body.status || booking.status;
  if (booking.status === 'approved') booking.paymentStatus = 'paid';
  if (booking.status === 'cancelled') booking.paymentStatus = 'refunded';
  await booking.save();

  res.json(booking);
};
