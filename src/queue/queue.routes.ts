import { Request, Response, Router } from 'express';
import { queueService } from '../config/qstash.js';
import logger from '../utils/logger.js';
import { EmailNotificationService } from '../notification/email.service.js';
import { SMSService } from '../notification/sms.service.js';
import { NotificationService, NotificationType } from '../notification/notification.service.js';
import { webhookService } from '../webhook/webhook.service.js';

const emailService = new EmailNotificationService();
const smsService = new SMSService();
const notificationService = new NotificationService();

const router = Router();

// Middleware to verify QStash signature
const verifyQStashSignature = async (req: Request, res: Response, next: Function) => {
  const signature = req.headers['upstash-signature'] as string;
  
  if (!signature) {
    res.status(401).json({ error: 'Missing signature' });
    return;
  }

  const body = JSON.stringify(req.body);
  const isValid = await queueService.verifySignature(signature, body);

  if (!isValid) {
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  next();
};

// Email queue handler
router.post('/email', verifyQStashSignature, async (req: Request, res: Response) => {
  try {
    const { to, subject, html } = req.body;
    logger.info('Processing email queue message', { to, subject });

    await emailService.sendEmail(to, subject, html);
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Email queue processing failed', { error });
    res.status(500).json({ error: 'Processing failed' });
  }
});

// SMS queue handler
router.post('/sms', verifyQStashSignature, async (req: Request, res: Response) => {
  try {
    const { phone, message } = req.body;
    logger.info('Processing SMS queue message', { phone });

    await smsService.sendSMS(phone, message);
    
    res.json({ success: true });
  } catch (error) {
    logger.error('SMS queue processing failed', { error });
    res.status(500).json({ error: 'Processing failed' });
  }
});

// Notification queue handler
router.post('/notification', verifyQStashSignature, async (req: Request, res: Response) => {
  try {
    const { userId, title, message, type } = req.body;
    logger.info('Processing notification queue message', { userId, type });

    await notificationService.sendNotification({
      userId,
      type: type as NotificationType,
      title,
      message
    });
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Notification queue processing failed', { error });
    res.status(500).json({ error: 'Processing failed' });
  }
});

// Webhook delivery handler — retries (with QStash backoff) on 5xx / network errors.
// Returns 200 on success and on permanent failures so QStash stops retrying.
router.post('/webhook', verifyQStashSignature, async (req: Request, res: Response) => {
  try {
    await webhookService.handleQueueDelivery(req.body);
    res.json({ success: true });
  } catch (error: any) {
    logger.error('Webhook queue processing failed', { error: error.message });
    res.status(500).json({ error: 'Processing failed' });
  }
});

// Webhook dead-letter handler — called by QStash when retries are exhausted.
// Auto-disables the subscription so dead endpoints stop burning attempts.
router.post('/webhook/failed', verifyQStashSignature, async (req: Request, res: Response) => {
  try {
    await webhookService.handleDeadLetter(req.body);
    res.json({ success: true });
  } catch (error: any) {
    logger.error('Webhook dead-letter processing failed', { error: error.message });
    res.status(500).json({ error: 'Processing failed' });
  }
});

export default router;
