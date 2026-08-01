import User from '../models/User.js';

export const getProfile = async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');
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

  user.name = req.body.name || user.name;
  user.phone = req.body.phone || user.phone;
  user.avatar = req.body.avatar || user.avatar;
  user.preferences = { ...user.preferences, ...req.body.preferences };

  const updatedUser = await user.save();
  res.json({ id: updatedUser._id, name: updatedUser.name, email: updatedUser.email, role: updatedUser.role, preferences: updatedUser.preferences });
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
