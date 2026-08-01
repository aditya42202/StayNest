import Chat from '../models/Chat.js';

export const getChats = async (req, res) => {
  const chats = await Chat.find({ participants: req.user._id }).populate('participants', 'name email');
  res.json({ chats });
};

export const createChat = async (req, res) => {
  const { participantId, text } = req.body;
  const chat = await Chat.create({ participants: [req.user._id, participantId], messages: [{ sender: req.user._id, text }] });
  res.status(201).json(chat);
};

export const sendMessage = async (req, res) => {
  const { text } = req.body;
  const chat = await Chat.findById(req.params.id);
  if (!chat || !chat.participants.includes(req.user._id)) {
    res.status(404);
    throw new Error('Chat not found');
  }
  chat.messages.push({ sender: req.user._id, text });
  chat.updatedAt = Date.now();
  await chat.save();
  res.json(chat);
};
