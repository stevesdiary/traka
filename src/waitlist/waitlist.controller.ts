import { Request, Response } from 'express';
import { WaitlistService } from './waitlist.service.js';
import { waitlistSchema, notifyWaitlistSchema } from '../utils/service-area.validators.js';

const waitlistService = new WaitlistService();

export class WaitlistController {
  async addToWaitlist(req: Request, res: Response) {
    try {
      const { error, value } = waitlistSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      const result = await waitlistService.addToWaitlist(value);

      res.status(201).json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getWaitlist(req: Request, res: Response) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 50;

      const result = await waitlistService.getAllWaitlist(page, limit);
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getWaitlistByCity(req: Request, res: Response) {
    try {
      const grouped = await waitlistService.getWaitlistByCity();
      res.json({ success: true, data: grouped });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async notifyWaitlist(req: Request, res: Response) {
    try {
      const { error, value } = notifyWaitlistSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      const result = await waitlistService.notifyWaitlist(value.city);
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
