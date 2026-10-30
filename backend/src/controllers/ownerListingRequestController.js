import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import OwnerListingRequest from '../models/OwnerListingRequest.js';
import Property from '../models/Property.js';
import User from '../models/User.js';
import { sendEmail } from '../utils/sendEmail.js';

const categories = ['boys pg', 'girls pg', 'hostel', 'shared room', 'private room', 'flat', 'house'];

const cleanText = (value) => (typeof value === 'string' ? value.trim() : '');

export const submitOwnerListingRequest = async (req, res) => {
  if (cleanText(req.body.website)) {
    return res.status(201).json({ message: 'Your property request has been submitted for review.' });
  }

  const ownerName = cleanText(req.body.ownerName);
  const email = cleanText(req.body.email).toLowerCase();
  const phone = cleanText(req.body.phone);
  const title = cleanText(req.body.title);
  const description = cleanText(req.body.description);
  const category = cleanText(req.body.category).toLowerCase();
  const city = cleanText(req.body.city);
  const area = cleanText(req.body.area);
  const address = cleanText(req.body.address);
  const rent = Number(req.body.rent);
  const rentPerDay = req.body.rentPerDay === '' || req.body.rentPerDay == null ? undefined : Number(req.body.rentPerDay);
  const rentPerHour = req.body.rentPerHour === '' || req.body.rentPerHour == null ? undefined : Number(req.body.rentPerHour);
  const deposit = req.body.deposit === '' || req.body.deposit == null ? 0 : Number(req.body.deposit);

  if (!ownerName || !email || !phone || !title || !description || !city || !area || !address) {
    return res.status(400).json({ message: 'Please complete all required fields.' });
  }
  if (ownerName.length > 120 || email.length > 254 || !/^\S+@\S+\.\S+$/.test(email) || phone.length > 30) {
    return res.status(400).json({ message: 'Please provide valid owner contact details.' });
  }
  if (title.length > 160 || description.length > 5000 || address.length > 500) {
    return res.status(400).json({ message: 'Some property details are longer than allowed.' });
  }
  if (!categories.includes(category)) {
    return res.status(400).json({ message: 'Please select a valid property category.' });
  }
  if (!Number.isFinite(rent) || rent < 1 || !Number.isFinite(deposit) || deposit < 0) {
    return res.status(400).json({ message: 'Please enter a valid rent and deposit.' });
  }
  if ((rentPerDay !== undefined && (!Number.isFinite(rentPerDay) || rentPerDay <= 0))
    || (rentPerHour !== undefined && (!Number.isFinite(rentPerHour) || rentPerHour <= 0))) {
    return res.status(400).json({ message: 'Daily and hourly rent must be greater than zero when provided.' });
  }

  const amenities = Array.isArray(req.body.amenities)
    ? req.body.amenities.map(cleanText).filter(Boolean).slice(0, 30)
    : cleanText(req.body.amenities).split(',').map((item) => item.trim()).filter(Boolean).slice(0, 30);
  const images = Array.isArray(req.body.images)
    ? req.body.images.map(cleanText).filter(Boolean).slice(0, 10)
    : cleanText(req.body.images).split(/\r?\n/).map((item) => item.trim()).filter(Boolean).slice(0, 10);

  if (images.some((image) => {
    try {
      return !['http:', 'https:'].includes(new URL(image).protocol);
    } catch {
      return true;
    }
  })) {
    return res.status(400).json({ message: 'Property image links must be valid HTTP or HTTPS URLs.' });
  }

  const pendingRequest = await OwnerListingRequest.exists({ email, status: { $in: ['pending', 'processing'] } });
  if (pendingRequest) {
    return res.status(409).json({ message: 'A property request for this email is already awaiting review.' });
  }

  const listingRequest = await OwnerListingRequest.create({
    ownerName,
    email,
    phone,
    title,
    description,
    category,
    city,
    area,
    college: cleanText(req.body.college),
    landmark: cleanText(req.body.landmark),
    address,
    rent,
    rentPerDay,
    rentPerHour,
    deposit,
    amenities,
    images
  });

  res.status(201).json({
    message: 'Your property request has been submitted for review. We will contact you after review.',
    requestId: listingRequest._id
  });
};

export const getOwnerListingRequests = async (req, res) => {
  const requests = await OwnerListingRequest.find().sort({ createdAt: -1 });
  res.json({ requests });
};

export const approveOwnerListingRequest = async (req, res) => {
  const listingRequest = await OwnerListingRequest.findOneAndUpdate(
    { _id: req.params.id, status: 'pending' },
    { $set: { status: 'processing' } },
    { new: true }
  );

  if (!listingRequest) {
    res.status(404);
    throw new Error('Pending property request not found');
  }

  let owner;
  let property;
  let createdOwner = false;
  let accountEmailSent = false;

  try {
    owner = await User.findOne({ email: listingRequest.email });
    if (owner && owner.role !== 'owner') {
      res.status(409);
      throw new Error('This email already belongs to a non-owner account. Contact the submitter before approving.');
    }

    if (!owner) {
      if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        res.status(503);
        throw new Error('Configure owner account email before approving this request.');
      }
      owner = await User.create({
        name: listingRequest.ownerName,
        email: listingRequest.email,
        phone: listingRequest.phone,
        password: await bcrypt.hash(randomBytes(32).toString('hex'), 10),
        role: 'owner'
      });
      createdOwner = true;
    }

    property = await Property.create({
      owner: owner._id,
      title: listingRequest.title,
      description: listingRequest.description,
      category: listingRequest.category,
      city: listingRequest.city,
      area: listingRequest.area,
      college: listingRequest.college,
      landmark: listingRequest.landmark,
      address: listingRequest.address,
      rent: listingRequest.rent,
      rentPerDay: listingRequest.rentPerDay,
      rentPerHour: listingRequest.rentPerHour,
      deposit: listingRequest.deposit,
      amenities: listingRequest.amenities,
      images: listingRequest.images,
      available: true,
      verified: true
    });

    await User.findByIdAndUpdate(owner._id, { $addToSet: { properties: property._id } });
    if (createdOwner) {
      const resetToken = randomBytes(32).toString('hex');
      owner.passwordResetToken = createHash('sha256').update(resetToken).digest('hex');
      owner.passwordResetExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await owner.save();

      const clientUrl = (process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173')
        .split(',')[0]
        .trim()
        .replace(/\/+$/, '');
      await sendEmail({
        to: owner.email,
        subject: 'Your StayNest owner listing is approved',
        text: `Your property listing has been approved. Set your owner account password using this link, which expires in 24 hours:\n\n${clientUrl}/reset-password/${resetToken}`
      });
      accountEmailSent = true;
    }

    listingRequest.status = 'approved';
    listingRequest.property = property._id;
    listingRequest.reviewedAt = new Date();
    await property.populate('owner', 'name email');
    await listingRequest.save();
  } catch (error) {
    if (property) {
      await Property.deleteOne({ _id: property._id });
      if (owner && !createdOwner) {
        await User.findByIdAndUpdate(owner._id, { $pull: { properties: property._id } });
      }
    }
    if (createdOwner && owner) await User.deleteOne({ _id: owner._id });
    await OwnerListingRequest.updateOne({ _id: listingRequest._id, status: 'processing' }, { $set: { status: 'pending' } });
    throw error;
  }

  res.json({
    request: listingRequest,
    property,
    accountEmailSent,
    message: accountEmailSent
      ? 'Request approved and owner account setup email sent.'
      : 'Request approved and added to the existing owner account.'
  });
};

export const rejectOwnerListingRequest = async (req, res) => {
  const listingRequest = await OwnerListingRequest.findOneAndUpdate(
    { _id: req.params.id, status: 'pending' },
    { $set: { status: 'rejected', reviewedAt: new Date() } },
    { new: true }
  );

  if (!listingRequest) {
    res.status(404);
    throw new Error('Pending property request not found');
  }

  res.json({ request: listingRequest, message: 'Property request rejected.' });
};