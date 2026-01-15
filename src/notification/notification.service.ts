import { NotificationModel, NotificationPreferenceModel } from './notification.model.js';
import { SMSService } from './sms.service.js';
import { EmailNotificationService } from './email.service.js';

export enum NotificationType {
  DELIVERY_ASSIGNED = 'DELIVERY_ASSIGNED',
  PICKUP_CONFIRMED = 'PICKUP_CONFIRMED',
  IN_TRANSIT = 'IN_TRANSIT',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  RATING_RECEIVED = 'RATING_RECEIVED',
  RIDER_ASSIGNED = 'RIDER_ASSIGNED',
  RIDER_ARRIVED = 'RIDER_ARRIVED'
}

interface NotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
}

export class NotificationService {
  private smsService = new SMSService();
  private emailService = new EmailNotificationService();

  async sendNotification(payload: NotificationPayload): Promise<void> {
    const preferences = await this.getPreferences(payload.userId);

    // Store notification
    await NotificationModel.create({
      user_id: payload.userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      data: payload.data,
      is_sent: false
    });

    // Send via enabled channels
    const promises = [];
    
    if (preferences?.push_enabled && preferences.fcm_token) {
      promises.push(this.sendPushNotification(preferences.fcm_token, payload));
    }
    
    if (preferences?.sms_enabled) {
      promises.push(this.sendSMS(payload.userId, payload.message));
    }
    
    if (preferences?.email_enabled) {
      promises.push(this.sendEmail(payload.userId, payload.title, payload.message));
    }

    await Promise.allSettled(promises);
  }

  async sendToRider(riderId: string, type: NotificationType, packageData: any): Promise<void> {
    const messages: Partial<Record<NotificationType, { title: string; message: string }>> = {
      DELIVERY_ASSIGNED: {
        title: 'New Delivery Assigned',
        message: `You have a new delivery: ${packageData.tracking_number}. Pickup at ${packageData.pickup_address}`
      },
      PAYMENT_RECEIVED: {
        title: 'Payment Received',
        message: `₦${packageData.amount} has been credited to your wallet`
      },
      RATING_RECEIVED: {
        title: 'New Rating',
        message: `You received a ${packageData.rating}-star rating`
      }
    };

    const notification = messages[type];
    if (notification) {
      await this.sendNotification({
        userId: riderId,
        type,
        title: notification.title,
        message: notification.message,
        data: packageData
      });
    }
  }

  async sendToCustomer(customerId: string, type: NotificationType, packageData: any): Promise<void> {
    const messages: Partial<Record<NotificationType, { title: string; message: string }>> = {
      RIDER_ASSIGNED: {
        title: 'Rider Assigned',
        message: `A rider has been assigned to your package ${packageData.tracking_number}. ${packageData.rider_name} will pick up your package soon.`
      },
      RIDER_ARRIVED: {
        title: 'Rider Arrived',
        message: `Your rider ${packageData.rider_name} has arrived at the pickup location for package ${packageData.tracking_number}`
      },
      PICKUP_CONFIRMED: {
        title: 'Package Picked Up',
        message: `Your package ${packageData.tracking_number} has been picked up and is on its way`
      },
      IN_TRANSIT: {
        title: 'Package In Transit',
        message: `Your package ${packageData.tracking_number} is in transit`
      },
      OUT_FOR_DELIVERY: {
        title: 'Out for Delivery',
        message: `Your package ${packageData.tracking_number} is out for delivery. Expected arrival soon!`
      },
      DELIVERED: {
        title: 'Package Delivered',
        message: `Your package ${packageData.tracking_number} has been delivered successfully`
      },
      CANCELLED: {
        title: 'Package Cancelled',
        message: `Your package ${packageData.tracking_number} has been cancelled`
      }
    };

    const notification = messages[type];
    if (notification) {
      await this.sendNotification({
        userId: customerId,
        type,
        title: notification.title,
        message: notification.message,
        data: packageData
      });
    }
  }

  private async sendPushNotification(fcmToken: string, payload: NotificationPayload): Promise<void> {
    // TODO: Integrate with Firebase Cloud Messaging
    console.log(`Push notification sent to ${fcmToken}:`, payload.title);
  }

  private async sendSMS(userId: string, message: string): Promise<void> {
    try {
      const user = await NotificationModel.sequelize?.models.UserModel.findByPk(userId);
      if (user && (user as any).phone) {
        await this.smsService.sendNotification((user as any).phone, 'TRAKA', message);
      }
    } catch (error) {
      console.error('Failed to send SMS:', error);
    }
  }

  private async sendEmail(userId: string, subject: string, message: string): Promise<void> {
    try {
      const user = await NotificationModel.sequelize?.models.UserModel.findByPk(userId);
      if (user && (user as any).email) {
        await this.emailService.sendNotification((user as any).email, subject, message);
      }
    } catch (error) {
      console.error('Failed to send email:', error);
    }
  }

  async getPreferences(userId: string): Promise<NotificationPreferenceModel | null> {
    return await NotificationPreferenceModel.findOne({ where: { user_id: userId } });
  }

  async updatePreferences(userId: string, preferences: {
    push_enabled?: boolean;
    sms_enabled?: boolean;
    email_enabled?: boolean;
    fcm_token?: string;
  }): Promise<void> {
    const [pref] = await NotificationPreferenceModel.findOrCreate({
      where: { user_id: userId },
      defaults: { user_id: userId, ...preferences }
    });

    await pref.update(preferences);
  }

  async getNotifications(userId: string, limit = 50): Promise<NotificationModel[]> {
    return await NotificationModel.findAll({
      where: { user_id: userId },
      order: [['createdAt', 'DESC']],
      limit
    });
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await NotificationModel.update(
      { is_read: true },
      { where: { id: notificationId, user_id: userId } }
    );
  }

  async markAllAsRead(userId: string): Promise<void> {
    await NotificationModel.update(
      { is_read: true },
      { where: { user_id: userId, is_read: false } }
    );
  }

  async getUnreadCount(userId: string): Promise<number> {
    return await NotificationModel.count({
      where: { user_id: userId, is_read: false }
    });
  }
}
