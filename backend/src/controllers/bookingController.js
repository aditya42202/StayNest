import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import Property from '../models/Property.js';
import Room from '../models/Room.js';
import { calculateRentalPrice } from '../utils/rentalPricing.js';
import { hasRoomConflict, isValidStayWindow } from '../utils/bookingAvailability.js';

const activeBookingStatuses = ['pending', 'approved'];

const findBookingConflict = ({ propertyId, roomId, checkIn, checkOut }) => {
  const query = {
    property: propertyId,
    status: { $in: activeBookingStatuses },
    checkIn: { $lt: checkOut },
    checkOut: { $gt: checkIn }
  };
  if (roomId) query.$or = [{ room: null }, { room: roomId }];
  return Booking.exists(query);
};

const findReservationConflict = (reservations, roomId, checkIn, checkOut) => (
  reservations.some((reservation) => (
    reservation.checkIn < checkOut
    && reservation.checkOut > checkIn
    && hasRoomConflict(reservation, roomId)
  ))
);

export const checkAvailability = async (req, res) => {
  const { propertyId, roomId, billingUnit = 'month', checkIn, checkOut } = req.query;
  if (!mongoose.isValidObjectId(propertyId) || (roomId && !mongoose.isValidObjectId(roomId))) {
    res.status(400);
    throw new Error('Choose a valid property and room');
  }
  if (!['hour', 'day', 'month', 'year'].includes(billingUnit)) {
    res.status(400);
    throw new Error('Choose a valid billing period');
  }
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  if (!isValidStayWindow(start, end)) {
    res.status(400);
    throw new Error('Choose a future check-in and a check-out after check-in');
  }

  const property = await Property.findById(propertyId);
  if (!property || !property.available) {
    res.status(404);
    throw new Error('Selected property is unavailable');
  }
  let room;
  if (roomId) {
    room = await Room.findOne({ _id: roomId, property: property._id, available: true });
    if (!room) {
      res.status(400);
      throw new Error('Selected room is unavailable');
    }
  }

  const [bookingConflict, latestProperty] = await Promise.all([
    findBookingConflict({ propertyId: property._id, roomId: room?._id, checkIn: start, checkOut: end }),
    Property.findById(property._id).select('+activeReservations')
  ]);
  const reservationConflict = findReservationConflict(
    latestProperty?.activeReservations || [],
    room?._id,
    start,
    end
  );
  const { rate, amount } = calculateRentalPrice({
    property,
    room,
    billingUnit,
    checkIn: start,
    checkOut: end
  });

  res.json({ available: !bookingConflict && !reservationConflict, rate, amount, billingUnit });
};

export const createBooking = async (req, res) => {
  const { propertyId, roomId, billingUnit = 'month', paymentPlan = 'upfront', checkIn, checkOut } = req.body;

  if (!mongoose.isValidObjectId(propertyId) || (roomId && !mongoose.isValidObjectId(roomId))) {
    res.status(400);
    throw new Error('Choose a valid property and room');
  }
  if (!['hour', 'day', 'month', 'year'].includes(billingUnit)) {
    res.status(400);
    throw new Error('Choose a valid billing period');
  }
  if (!['upfront', 'installments'].includes(paymentPlan)) {
    res.status(400);
    throw new Error('Choose a valid payment plan');
  }
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  if (!isValidStayWindow(start, end)) {
    res.status(400);
    throw new Error('Choose a future check-in and a check-out after check-in');
  }

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

  const [bookingConflict, latestProperty] = await Promise.all([
    findBookingConflict({ propertyId: property._id, roomId: room?._id, checkIn: start, checkOut: end }),
    Property.findById(property._id).select('+activeReservations')
  ]);
  if (
    bookingConflict
    || findReservationConflict(latestProperty?.activeReservations || [], room?._id, start, end)
  ) {
    res.status(409);
    throw new Error('The selected dates are no longer available');
  }

  let price;
  try {
    price = calculateRentalPrice({ property, room, billingUnit, checkIn: start, checkOut: end });
  } catch (error) {
    res.status(400);
    throw error;
  }

  const booking = new Booking({
    property: property._id,
    room: room?._id,
    student: req.user._id,
    owner: property.owner,
    checkIn: start,
    checkOut: end,
    billingUnit,
    paymentPlan,
    totalPrice: price.amount,
    amountPaid: 0,
    installmentRate: price.rate,
    nextPaymentAmount: paymentPlan === 'installments' ? Math.min(price.rate, price.amount) : price.amount,
    nextPaymentDueAt: paymentPlan === 'installments' ? start : undefined,
    paymentStatus: 'unpaid'
  });

  const reservationQuery = {
    _id: property._id,
    available: true,
    activeReservations: {
      $not: {
        $elemMatch: {
          checkIn: { $lt: end },
          checkOut: { $gt: start },
          ...(room ? { $or: [{ room: null }, { room: room._id }] } : {})
        }
      }
    }
  };
  const reservedProperty = await Property.findOneAndUpdate(
    reservationQuery,
    {
      $push: {
        activeReservations: {
          booking: booking._id,
          room: room?._id || null,
          checkIn: start,
          checkOut: end
        }
      }
    },
    { new: true, projection: { _id: 1 } }
  );
  if (!reservedProperty) {
    res.status(409);
    throw new Error('The selected dates are no longer available');
  }

  try {
    await booking.save();
  } catch (error) {
    await Property.updateOne(
      { _id: property._id },
      { $pull: { activeReservations: { booking: booking._id } } }
    );
    throw error;
  }

  res.status(201).json({
    booking,
    message: 'Booking request sent to the property owner',
    quote: { rate: price.rate, amount: price.amount, billingUnit }
  });
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
  if (!['approved', 'rejected', 'cancelled'].includes(requestedStatus)) {
    res.status(400);
    throw new Error('Choose a valid booking status');
  }
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
  if (booking.status === 'cancelled' && booking.paymentStatus !== 'unpaid') booking.paymentStatus = 'refunded';
  await booking.save();
  if (['cancelled', 'rejected'].includes(booking.status)) {
    await Property.updateOne(
      { _id: booking.property },
      { $pull: { activeReservations: { booking: booking._id } } }
    );
  }

  res.json(booking);
};
