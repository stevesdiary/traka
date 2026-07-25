import { Request, Response } from 'express';
import { SchedulingService } from './scheduling.service.js';
import { DeliveryScheduleType } from './scheduling.types.js';
import { FeatureOptInModel } from './feature-opt-in.model.js';
import config from '../config/environment.js';

export class SchedulingController {
  private schedulingService = new SchedulingService();

  scheduleDelivery = async (req: Request, res: Response): Promise<void> => {
    try {
      const { packageId, scheduleType, scheduledFor } = req.body;

      // Validate schedule type
      if (!Object.values(DeliveryScheduleType).includes(scheduleType)) {
        res.status(400).json({ error: 'Invalid schedule type' });
        return;
      }

      // Validate scheduledFor for SCHEDULED type
      if (scheduleType === DeliveryScheduleType.SCHEDULED && !scheduledFor) {
        res.status(400).json({ error: 'scheduledFor required for SCHEDULED type' });
        return;
      }

      await this.schedulingService.scheduleDelivery({
        packageId,
        scheduleType,
        scheduledFor
      });

      res.status(201).json({ 
        message: 'Delivery scheduled successfully',
        scheduleType 
      });
    } catch (error: any) {
      res.status(500).json({ error: config.isDevelopment ? error.message : 'Internal server error' });
    }
  };

  processPending = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.schedulingService.processPendingDeliveries();
      res.json({ message: 'Pending deliveries processed' });
    } catch (error: any) {
      res.status(500).json({ error: config.isDevelopment ? error.message : 'Internal server error' });
    }
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