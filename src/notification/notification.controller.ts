import { Request, Response } from 'express';
import { NotificationService } from './notification.service.js';
import config from '../config/environment.js';

export class NotificationController {
  private notificationService = new NotificationService();

  getNotifications = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const limit = req.query.limit ? Number(req.query.limit) : 50;

      const notifications = await this.notificationService.getNotifications(userId, limit);

      res.json({
        notifications,
        count: notifications.length
      });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to get notifications' });
    }
  };

  getUnreadCount = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const count = await this.notificationService.getUnreadCount(userId);

      res.json({ unread_count: count });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to get unread count' });
    }
  };

  markAsRead = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      await this.notificationService.markAsRead(id, userId);

      res.json({ message: 'Notification marked as read' });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to mark notification as read' });
    }
  };

  markAllAsRead = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;

      await this.notificationService.markAllAsRead(userId);

      res.json({ message: 'All notifications marked as read' });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to mark all as read' });
    }
  };

  getPreferences = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const preferences = await this.notificationService.getPreferences(userId);

      res.json(preferences || {
        push_enabled: true,
        sms_enabled: true,
        email_enabled: true
      });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to get preferences' });
    }
  };

  updatePreferences = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { push_enabled, sms_enabled, email_enabled, fcm_token } = req.body;

      await this.notificationService.updatePreferences(userId, {
        push_enabled,
        sms_enabled,
        email_enabled,
        fcm_token
      });

      res.json({ message: 'Preferences updated successfully' });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to update preferences' });
    }
  };

  testSMS = async (req: Request, res: Response): Promise<void> => {
    try {
      const { phone, message } = req.body;
      
      if (!phone || !message) {
        res.status(400).json({ error: 'Phone and message are required' });
        return;
      }

      const { SMSService } = await import('./sms.service.js');
      const smsService = new SMSService();
      await smsService.sendSMS(phone, message);

      res.json({ message: 'SMS sent successfully', phone });
    } catch (error: any) {
      res.status(500).json({ error: config.isDevelopment ? error.message : 'Failed to send SMS' });
    }
  };
}
