import admin from 'firebase-admin';
import logger from '../utils/logger.js';

class PushNotificationService {
  private initialized = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    try {
      const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
      
      if (!serviceAccount) {
        logger.warn('Firebase service account not configured. Push notifications disabled.');
        return;
      }

      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(serviceAccount))
      });

      this.initialized = true;
      logger.info('Firebase Admin initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Firebase Admin', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async sendToDevice(token: string, title: string, body: string, data?: any): Promise<boolean> {
    if (!this.initialized) {
      logger.warn('Push notification skipped - Firebase not initialized');
      return false;
    }

    try {
      const message = {
        notification: {
          title,
          body
        },
        data: data ? this.sanitizeData(data) : {},
        token
      };

      const response = await admin.messaging().send(message);
      logger.info('Push notification sent successfully', { messageId: response });
      return true;
    } catch (error) {
      logger.error('Failed to send push notification', {
        error: error instanceof Error ? error.message : String(error),
        token: token.substring(0, 20) + '...'
      });
      return false;
    }
  }

  async sendToMultipleDevices(tokens: string[], title: string, body: string, data?: any): Promise<void> {
    if (!this.initialized || tokens.length === 0) return;

    try {
      const message = {
        notification: {
          title,
          body
        },
        data: data ? this.sanitizeData(data) : {},
        tokens
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      logger.info('Multicast push notification sent', {
        successCount: response.successCount,
        failureCount: response.failureCount
      });
    } catch (error) {
      logger.error('Failed to send multicast push notification', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private sanitizeData(data: any): Record<string, string> {
    const sanitized: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = typeof value === 'string' ? value : JSON.stringify(value);
    }
    return sanitized;
  }
}

export default new PushNotificationService();
