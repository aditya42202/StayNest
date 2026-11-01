import Property from '../models/Property.js';
import Booking from '../models/Booking.js';
import Review from '../models/Review.js';
import User from '../models/User.js';
import { hasRoomConflict, intervalsOverlap, isValidStayWindow } from '../utils/bookingAvailability.js';

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const rateForUnit = (property, room, billingUnit) => {
  const monthlyRate = Number(room?.price || property.rent);
  const dailyRate = Number(property.rentPerDay || monthlyRate / 30);
  if (billingUnit === 'hour') return Number(property.rentPerHour || dailyRate / 24);
  if (billingUnit === 'day') return dailyRate;
  if (billingUnit === 'year') return monthlyRate * 12;
  return monthlyRate;
};

export const getProperties = async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 12;
  const skip = (page - 1) * limit;

  const query = { available: true };
  if (req.query.city) query.city = req.query.city;
  if (req.query.area) query.area = req.query.area;
  if (req.query.college) query.college = req.query.college;
  if (req.query.category) query.category = req.query.category;
  if (req.query.minRent || req.query.maxRent) {
    query.rent = {};
    if (req.query.minRent) query.rent.$gte = Number(req.query.minRent);
    if (req.query.maxRent) query.rent.$lte = Number(req.query.maxRent);
  }

  const total = await Property.countDocuments(query);
  const properties = await Property.find(query)
    .populate('owner', 'name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  res.json({ properties, page, pages: Math.ceil(total / limit), total });
};

export const searchProperties = async (req, res) => {
  const {
    q, city, area, college, category, budget, minPrice, maxPrice, billingUnit = 'month',
    amenities, verified, minRating, checkIn, checkOut, guests, roomCount
  } = req.query;
  if (!['hour', 'day', 'month', 'year'].includes(billingUnit)) {
    res.status(400);
    throw new Error('Choose a valid billing period');
  }
  if (Boolean(checkIn) !== Boolean(checkOut)) {
    res.status(400);
    throw new Error('Provide both check-in and check-out dates');
  }
  const start = checkIn ? new Date(checkIn) : null;
  const end = checkOut ? new Date(checkOut) : null;
  if (start && !isValidStayWindow(start, end)) {
    res.status(400);
    throw new Error('Choose a future check-in and a check-out after check-in');
  }

  const query = { available: true };
  if (q) query.$text = { $search: q };
  if (city) query.city = new RegExp(`^${escapeRegex(city.trim())}$`, 'i');
  if (area) query.area = new RegExp(escapeRegex(area.trim()), 'i');
  if (college) query.college = new RegExp(escapeRegex(college.trim()), 'i');
  if (category) query.category = new RegExp(`^${escapeRegex(category.trim())}$`, 'i');
  if (verified === 'true') query.verified = true;
  if (verified === 'false') query.verified = false;
  const ratingFloor = minRating === undefined || minRating === '' ? undefined : Number(minRating);
  if (ratingFloor !== undefined) {
    if (!Number.isFinite(ratingFloor) || ratingFloor < 0 || ratingFloor > 5) {
      res.status(400);
      throw new Error('Minimum rating must be between 0 and 5');
    }
    query.rating = { $gte: ratingFloor };
  }
  const requestedAmenities = amenities
    ? String(amenities).split(',').map((item) => item.trim()).filter(Boolean)
    : [];
  if (requestedAmenities.length) {
    query.amenities = {
      $all: requestedAmenities.map((item) => new RegExp(`^${escapeRegex(item)}$`, 'i'))
    };
  }
  const guestCount = guests === undefined || guests === '' ? undefined : Number(guests);
  if (guestCount !== undefined && (!Number.isInteger(guestCount) || guestCount < 1 || guestCount > 20)) {
    res.status(400);
    throw new Error('Guest count must be between 1 and 20');
  }
  const requestedRoomCount = roomCount === undefined || roomCount === '' ? 1 : Number(roomCount);
  if (!Number.isInteger(requestedRoomCount) || requestedRoomCount < 1 || requestedRoomCount > 10) {
    res.status(400);
    throw new Error('Room count must be between 1 and 10');
  }

  const minimum = minPrice === undefined || minPrice === '' ? undefined : Number(minPrice);
  const maximum = maxPrice === undefined
    ? (budget === undefined || budget === '' ? undefined : Number(budget))
    : Number(maxPrice);
  if (
    (minimum !== undefined && (!Number.isFinite(minimum) || minimum < 0))
    || (maximum !== undefined && (!Number.isFinite(maximum) || maximum < 0))
    || (minimum !== undefined && maximum !== undefined && minimum > maximum)
  ) {
    res.status(400);
    throw new Error('Enter a valid minimum and maximum price');
  }

  const properties = await Property.find(query)
    .populate('owner', 'name')
    .populate('rooms')
    .select('+activeReservations')
    .sort({ verified: -1, rating: -1, createdAt: -1 })
    .limit(100);

  let bookingsByProperty = new Map();
  if (start) {
    const activeBookings = await Booking.find({
      property: { $in: properties.map((property) => property._id) },
      status: { $in: ['pending', 'approved'] },
      checkIn: { $lt: end },
      checkOut: { $gt: start }
    }).select('property room checkIn checkOut');
    bookingsByProperty = activeBookings.reduce((grouped, booking) => {
      const propertyId = booking.property.toString();
      grouped.set(propertyId, [...(grouped.get(propertyId) || []), booking]);
      return grouped;
    }, new Map());
  }

  const filteredProperties = properties.filter((property) => {
    const applicableRooms = property.rooms.length
      ? property.rooms.filter((room) => room.available)
      : [null];
    if (applicableRooms.length < requestedRoomCount) return false;

    const existingReservations = [
      ...property.activeReservations,
      ...(bookingsByProperty.get(property._id.toString()) || [])
    ];
    let searchRate;
    let matchingRoomCount = 0;
    applicableRooms.forEach((room) => {
      if (guestCount && room && (room.occupantLimit || 1) < guestCount) return false;
      if (start && existingReservations.some((reservation) => (
        intervalsOverlap(reservation.checkIn, reservation.checkOut, start, end)
        && hasRoomConflict(reservation, room?._id)
      ))) return;

      const rate = rateForUnit(property, room, billingUnit);
      const matchesPrice = Number.isFinite(rate)
        && (minimum === undefined || rate >= minimum)
        && (maximum === undefined || rate <= maximum);
      if (matchesPrice) {
        matchingRoomCount += 1;
        if (searchRate === undefined || rate < searchRate) searchRate = rate;
      }
    });
    if (matchingRoomCount >= requestedRoomCount) property.set('searchRate', searchRate);
    return matchingRoomCount >= requestedRoomCount;
  });

  res.json({ properties: filteredProperties.slice(0, 30), total: filteredProperties.length, billingUnit });
};

export const getFeaturedProperties = async (req, res) => {
  const properties = await Property.find({ available: true })
    .populate('owner', 'name')
    .sort({ rating: -1, createdAt: -1 })
    .limit(8);
  res.json({ properties });
};

export const getPropertyById = async (req, res) => {
  const property = await Property.findById(req.params.id)
    .populate('owner', 'name')
    .populate('rooms')
    .populate({ path: 'reviews', model: Review });

  if (!property) {
    res.status(404);
    throw new Error('Property not found');
  }
  res.json(property);
};

export const createProperty = async (req, res) => {
  const { title, description, category, city, area, college, landmark, address, rent, rentPerDay, rentPerHour, deposit, amenities, lat, lng, images } = req.body;

  const property = await Property.create({
    owner: req.user._id,
    title,
    description,
    category,
    city,
    area,
    college,
    landmark,
    address,
    rent,
    rentPerDay,
    rentPerHour,
    deposit,
    amenities,
    images,
    mapLocation: { lat, lng }
  });

  await User.findByIdAndUpdate(req.user._id, { $push: { properties: property._id } });
  res.status(201).json(property);
};

export const updateProperty = async (req, res) => {
  const property = await Property.findById(req.params.id);
  if (!property) {
    res.status(404);
    throw new Error('Property not found');
  }
  if (property.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to edit this property');
  }

  const editableFields = [
    'title',
    'description',
    'category',
    'type',
    'city',
    'area',
    'college',
    'landmark',
    'address',
    'rent',
    'rentPerDay',
    'rentPerHour',
    'deposit',
    'amenities',
    'images',
    'videos',
    'mapLocation',
    'available'
  ];
  editableFields.forEach((field) => {
    if (Object.hasOwn(req.body, field)) {
      property[field] = req.body[field];
    }
  });
  await property.save();
  res.json(property);
};

export const deleteProperty = async (req, res) => {
  const property = await Property.findById(req.params.id);
  if (!property) {
    res.status(404);
    throw new Error('Property not found');
  }
  if (property.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to delete this property');
  }

  const bookingCount = await Booking.countDocuments({ property: property._id });
  if (bookingCount > 0) {
    res.status(400);
    throw new Error('This property has booking history and cannot be deleted. Mark it unavailable instead.');
  }

  await property.deleteOne();
  await User.findByIdAndUpdate(property.owner, { $pull: { properties: property._id } });
  res.json({ message: 'Property removed successfully' });
};

export const addWishlist = async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  if (user.wishlist.includes(req.params.id)) {
    res.status(400);
    throw new Error('Property already in wishlist');
  }
  user.wishlist.push(req.params.id);
  await user.save();
  res.json({ wishlist: user.wishlist });
};

export const removeWishlist = async (req, res) => {
  const user = await User.findById(req.user._id);
  user.wishlist = user.wishlist.filter((propertyId) => propertyId.toString() !== req.params.id);
  await user.save();
  res.json({ wishlist: user.wishlist });
};

export const createReview = async (req, res) => {
  const property = await Property.findById(req.params.id);
  if (!property) {
    res.status(404);
    throw new Error('Property not found');
  }
  const rating = Number(req.body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    res.status(400);
    throw new Error('Rating must be between 1 and 5');
  }
  const existingReview = await Review.findOne({ property: property._id, user: req.user._id });
  if (existingReview) {
    res.status(400);
    throw new Error('You have already reviewed this property');
  }
  const review = await Review.create({
    property: property._id,
    user: req.user._id,
    rating,
    comment: typeof req.body.comment === 'string' ? req.body.comment.trim() : ''
  });
  property.reviews.push(review._id);
  await property.save();

  const reviews = await Review.find({ property: property._id });
  property.rating = reviews.reduce((total, item) => total + item.rating, 0) / reviews.length;
  await property.save();
  res.status(201).json(review);
};
