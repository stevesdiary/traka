import { Router } from 'express';
import messageController from './message.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/packages/:packageId/messages', authenticateToken, (req, res) => 
  messageController.sendMessage(req, res)
);

router.get('/packages/:packageId/messages', authenticateToken, (req, res) => 
  messageController.getMessages(req, res)
);

router.get('/packages/:packageId/messages/unread', authenticateToken, (req, res) => 
  messageController.getUnreadCount(req, res)
);

export default router;
