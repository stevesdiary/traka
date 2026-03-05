import { Request, Response, Router } from 'express';
import { queueService } from '../config/qstash.js';
import logger from '../utils/logger.js';

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
    
    // Process email sending here
    // await emailService.sendEmail(to, subject, html);
    
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
    
    // Process SMS sending here
    // await smsService.sendSMS(phone, message);
    
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
    
    // Process notification here
    // await notificationService.sendNotification(userId, title, message, type);
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Notification queue processing failed', { error });
    res.status(500).json({ error: 'Processing failed' });
  }
});

export default router;
