import Complaint from '../models/Complaint.js';

export const createComplaint = async (req, res) => {
  const complaint = await Complaint.create({
    user: req.user._id,
    property: req.body.property,
    booking: req.body.booking,
    message: req.body.message
  });
  res.status(201).json(complaint);
};

export const getUserComplaints = async (req, res) => {
  const complaints = await Complaint.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json({ complaints });
};

export const getAllComplaints = async (req, res) => {
  const complaints = await Complaint.find().populate('user', 'name email').populate('property', 'title');
  res.json({ complaints });
};

export const updateComplaintStatus = async (req, res) => {
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) {
    res.status(404);
    throw new Error('Complaint not found');
  }
  complaint.status = req.body.status;
  await complaint.save();
  res.json(complaint);
};
