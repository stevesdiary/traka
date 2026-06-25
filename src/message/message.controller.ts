import { Request, Response } from 'express';
import messageService from './message.service.js';

const getUserId = (req: Request) =>
  (req as any).user?.userId || (req as any).user?.id;

export class MessageController {
  async sendMessage(req: Request, res: Response) {
    try {
      const { packageId } = req.params;
      const { message, content } = req.body;
      const text = (message || content)?.trim();
      const userId = getUserId(req);

      if (!text) {
        return res.status(400).json({ error: 'Message is required' });
      }

      const newMessage = await messageService.sendMessage(packageId, userId, text);
      res.status(201).json({ message: newMessage });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getMessages(req: Request, res: Response) {
    try {
      const { packageId } = req.params;
      const userId = getUserId(req);

      const messages = await messageService.getMessages(packageId, userId);
      res.json({ messages });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getUnreadCount(req: Request, res: Response) {
    try {
      const { packageId } = req.params;
      const userId = getUserId(req);

      const count = await messageService.getUnreadCount(packageId, userId);
      res.json({ count });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}

export default new MessageController();
