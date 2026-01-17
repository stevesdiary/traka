import { Request, Response } from 'express';
import { ReferralService } from './referral.service.js';

export class ReferralController {
  private referralService = new ReferralService();

  getMyReferralCode = async (req: Request, res: Response): Promise<void> => {
    try {
      const riderId = req.user!.userId;
      const referralCode = await this.referralService.getRiderReferralCode(riderId);

      res.json({
        message: 'Referral code retrieved',
        referral_code: referralCode
      });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to get referral code' });
    }
  };

  applyReferralCode = async (req: Request, res: Response): Promise<void> => {
    try {
      const riderId = req.user!.userId;
      const { referral_code } = req.body;

      if (!referral_code) {
        res.status(400).json({ error: 'Referral code is required' });
        return;
      }

      await this.referralService.applyReferralCode(riderId, referral_code);

      res.json({
        message: 'Referral code applied successfully. Complete your first delivery to earn ₦1,000!'
      });
    } catch (error: any) {
      if (error.message.includes('Invalid') || error.message.includes('Cannot') || error.message.includes('already')) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Failed to apply referral code' });
    }
  };

  getReferralStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const riderId = req.user!.userId;
      const stats = await this.referralService.getReferralStats(riderId);

      res.json({
        message: 'Referral stats retrieved',
        data: stats
      });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to get referral stats' });
    }
  };
}
