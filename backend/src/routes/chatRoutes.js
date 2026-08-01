import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getChats, createChat, sendMessage } from '../controllers/chatController.js';

const router = express.Router();
router.use(protect);
router.get('/', getChats);
router.post('/', createChat);
router.post('/:id/message', sendMessage);
export default router;
