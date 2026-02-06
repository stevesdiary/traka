import { Request, Response } from 'express';
import messageService from './message.service.js';

export class MessageController {
  async sendMessage(req: Request, res: Response) {
    try {
      const { packageId } = req.params;
      const { message } = req.body;
      const userId = (req as any).user.id;

      if (!message?.trim()) {
        return res.status(400).json({ error: 'Message is required' });
      }

      const newMessage = await messageService.sendMessage(packageId, userId, message.trim());
      res.status(201).json(newMessage);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getMessages(req: Request, res: Response) {
    try {
      const { packageId } = req.params;
      const userId = (req as any).user.id;

      const messages = await messageService.getMessages(packageId, userId);
      res.json(messages);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getUnreadCount(req: Request, res: Response) {
    try {
      const { packageId } = req.params;
      const userId = (req as any).user.id;

      const count = await messageService.getUnreadCount(packageId, userId);
      res.json({ count });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}

export default new MessageController();
