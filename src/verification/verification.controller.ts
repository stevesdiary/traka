import { Request, Response } from 'express';
import { VerificationService } from './verification.service';

export class VerificationController {
  private verificationService: VerificationService;

  constructor() {
    this.verificationService = new VerificationService();
  }

  sendOTP = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email } = req.body;
      await this.verificationService.sendOTP(email);
      
      res.json({
        message: 'OTP sent successfully',
        email
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to send OTP' });
    }
  };

  verifyOTP = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, otp } = req.body;
      const isValid = await this.verificationService.verifyOTP(email, otp);
      
      if (!isValid) {
        res.status(400).json({ error: 'Invalid or expired OTP' });
        return;
      }

      res.json({
        message: 'Email verified successfully',
        verified: true
      });
    } catch (error) {
      res.status(500).json({ error: 'Verification failed' });
    }
  };
}