import User from '../models/User.js';

const profileProjection = 'name email role phone avatar preferences studentProfile ownerProfile adminProfile verified createdAt';

export const getProfile = async (req, res) => {
  const user = await User.findById(req.user._id).select(profileProjection);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  res.json(user);
};

export const updateProfile = async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (typeof req.body.name === 'string') user.name = req.body.name.trim();
  if (typeof req.body.phone === 'string') user.phone = req.body.phone.trim();

  if (req.user.role === 'student') {
    user.studentProfile ??= {};
    user.preferences ??= {};
    const { college, course, yearOfStudy } = req.body.studentProfile || {};
    if (college !== undefined) user.studentProfile.college = college;
    if (course !== undefined) user.studentProfile.course = course;
    if (yearOfStudy !== undefined) {
      user.studentProfile.yearOfStudy = yearOfStudy === '' ? undefined : Number(yearOfStudy);
    }

    const { budget, city, categories } = req.body.preferences || {};
    if (budget !== undefined) user.preferences.budget = budget === '' ? 0 : Number(budget);
    if (city !== undefined) user.preferences.city = city;
    if (categories !== undefined) user.preferences.categories = categories;
  } else if (req.user.role === 'owner') {
    user.ownerProfile ??= {};
    const { businessName, businessAddress, website } = req.body.ownerProfile || {};
    if (businessName !== undefined) user.ownerProfile.businessName = businessName;
    if (businessAddress !== undefined) user.ownerProfile.businessAddress = businessAddress;
    if (website !== undefined) user.ownerProfile.website = website;
  } else if (req.user.role === 'admin') {
    user.adminProfile ??= {};
    const { department, designation } = req.body.adminProfile || {};
    if (department !== undefined) user.adminProfile.department = department;
    if (designation !== undefined) user.adminProfile.designation = designation;
  }

  const updatedUser = await user.save();
  res.json({
    id: updatedUser._id,
    name: updatedUser.name,
    email: updatedUser.email,
    role: updatedUser.role,
    phone: updatedUser.phone,
    avatar: updatedUser.avatar,
    preferences: updatedUser.preferences,
    studentProfile: updatedUser.studentProfile,
    ownerProfile: updatedUser.ownerProfile,
    adminProfile: updatedUser.adminProfile,
    verified: updatedUser.verified,
    createdAt: updatedUser.createdAt
  });
};

export const getUserWishlist = async (req, res) => {
  const user = await User.findById(req.user._id).populate('wishlist');
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  res.json({ wishlist: user.wishlist });
};

export const updateUserPreferences = async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  user.preferences = { ...user.preferences, ...req.body };
  await user.save();
  res.json({ preferences: user.preferences });
};
