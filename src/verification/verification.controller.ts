import { Request, Response } from 'express';
import { VerificationService } from './verification.service.js';
import config from '../config/environment.js';

export class VerificationController {
  private verificationService: VerificationService;

  constructor() {
    this.verificationService = new VerificationService();
  }

  verifyEmail = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, code } = req.body;
      
      const verified = await this.verificationService.verifyEmail(email, code);
      
      if (!verified) {
        res.status(400).json({ error: 'Invalid or expired verification code' });
        return;
      }

      res.json({ message: 'Email verified successfully' });
    } catch (error: any) {
      res.status(500).json({ error: 'Verification failed', ...(config.isDevelopment && { details: error.message }) });
    }
  };

  verifyPhone = async (req: Request, res: Response): Promise<void> => {
    try {
      const { phone, code } = req.body;
      
      const verified = await this.verificationService.verifyPhone(phone, code);
      
      if (!verified) {
        res.status(400).json({ error: 'Invalid or expired verification code' });
        return;
      }

      res.json({ message: 'Phone verified successfully' });
    } catch (error: any) {
      res.status(500).json({ error: 'Verification failed', ...(config.isDevelopment && { details: error.message }) });
    }
  };

  resendEmailVerification = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email } = req.body;
      
      await this.verificationService.resendEmailVerification(email);
      
      res.json({ message: 'Verification code sent to email' });
    } catch (error: any) {
      if (error.message === 'User not found') {
        res.status(404).json({ error: error.message });
        return;
      }
      if (error.message === 'Email already verified') {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Failed to send verification code' });
    }
  };

  resendPhoneVerification = async (req: Request, res: Response): Promise<void> => {
    try {
      const { phone } = req.body;
      
      await this.verificationService.resendPhoneVerification(phone);
      
      res.json({ message: 'Verification code sent to phone' });
    } catch (error: any) {
      if (error.message === 'User not found') {
        res.status(404).json({ error: error.message });
        return;
      }
      if (error.message === 'Phone already verified') {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Failed to send verification code' });
    }
  };
}
