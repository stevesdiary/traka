import { Request, Response } from 'express';
import { FeatureOptInModel } from './feature-opt-in.model.js';
import config from '../config/environment.js';

const COMING_SOON_MESSAGE =
  'Scheduled deliveries are coming soon. Join the waitlist at POST /api/scheduling/opt-in/scheduled-delivery to be notified.';

export class SchedulingController {
  scheduleDelivery = async (req: Request, res: Response): Promise<void> => {
    res.status(503).json({ error: COMING_SOON_MESSAGE, coming_soon: true });
  };

  processPending = async (req: Request, res: Response): Promise<void> => {
    res.status(503).json({ error: COMING_SOON_MESSAGE, coming_soon: true });
  };

  optInForScheduledDelivery = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email } = req.body;

      if (!email || !email.includes('@')) {
        res.status(400).json({ error: 'Valid email is required' });
        return;
      }

      await FeatureOptInModel.create({
        email,
        feature_name: 'scheduled_delivery'
      });

      res.status(201).json({ 
        message: 'Thank you! We will notify you when scheduled delivery becomes available.' 
      });
    } catch (error: any) {
      res.status(500).json({ error: config.isDevelopment ? error.message : 'Internal server error' });
    }
  };
}