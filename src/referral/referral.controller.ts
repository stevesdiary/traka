import { Request, Response } from 'express';
import { ReferralService } from './referral.service.js';

export class ReferralController {
  private referralService = new ReferralService();

  getMyReferralCode = async (req: Request, res: Response): Promise<void> => {
    try {
      const riderId = req.user!.userId;
      
      if (req.user!.role !== 'RIDER') {
        res.status(403).json({ error: 'Only riders can access referral codes' });
        return;
      }

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

      if (req.user!.role !== 'RIDER') {
        res.status(403).json({ error: 'Only riders can apply referral codes' });
        return;
      }

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

  updateReferralCode = async (req: Request, res: Response): Promise<void> => {
    try {
      const riderId = req.user!.userId;
      const { referral_code } = req.body;

      if (req.user!.role !== 'RIDER') {
        res.status(403).json({ error: 'Only riders can update referral codes' });
        return;
      }

      if (!referral_code) {
        res.status(400).json({ error: 'Referral code is required' });
        return;
      }

      await this.referralService.updateReferralCode(riderId, referral_code);

      res.json({
        message: 'Referral code updated successfully',
        referral_code: referral_code.toUpperCase()
      });
    } catch (error: any) {
      if (error.message.includes('must be') || error.message.includes('already taken') || error.message.includes('can update')) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Failed to update referral code' });
    }
  };

  getReferralStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const riderId = req.user!.userId;
      
      if (req.user!.role !== 'RIDER') {
        res.status(403).json({ error: 'Only riders can access referral stats' });
        return;
      }

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
