import Property from '../models/Property.js';
import User from '../models/User.js';

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
    .populate('owner', 'name email phone')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  res.json({ properties, page, pages: Math.ceil(total / limit), total });
};

export const searchProperties = async (req, res) => {
  const { q, city, area, college, category, budget } = req.query;
  const query = { available: true };

  if (q) query.$text = { $search: q };
  if (city) query.city = new RegExp(`^${city}$`, 'i');
  if (area) query.area = new RegExp(`^${area}$`, 'i');
  if (college) query.college = new RegExp(`^${college}$`, 'i');
  if (category) query.category = { $regex: category, $options: 'i' };
  if (budget) {
    const budgetValue = Number(budget);
    if (!isNaN(budgetValue)) {
      query.rent = { $lte: budgetValue };
    }
  }

  const properties = await Property.find(query)
    .populate('owner', 'name email phone')
    .limit(30);

  res.json({ properties });
};

export const getFeaturedProperties = async (req, res) => {
  const properties = await Property.find({ available: true })
    .sort({ rating: -1, createdAt: -1 })
    .limit(8);
  res.json({ properties });
};

export const getPropertyById = async (req, res) => {
  const property = await Property.findById(req.params.id)
    .populate('owner', 'name email phone')
    .populate('reviews');

  if (!property) {
    res.status(404);
    throw new Error('Property not found');
  }
  res.json(property);
};

export const createProperty = async (req, res) => {
  const { title, description, category, city, area, college, landmark, address, rent, deposit, amenities, lat, lng, images } = req.body;

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

  Object.assign(property, req.body);
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

  await property.remove();
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
