import { Request, Response } from 'express';
import { ReferralService } from './referral.service.js';

export class ReferralController {
  private referralService = new ReferralService();

  getMyReferralCode = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const role = req.user!.role;

      const referralCode = role === 'RIDER'
        ? await this.referralService.getRiderReferralCode(userId)
        : await this.referralService.getCustomerReferralCode(userId);

      res.json({
        message: 'Referral code retrieved',
        referral: {
          code: referralCode,
          user_id: userId,
          usage_count: 0
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to get referral code' });
    }
  };

  applyReferralCode = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const role = req.user!.role;
      const { referral_code, code } = req.body;
      const referralCode = referral_code || code;

      if (!referralCode) {
        res.status(400).json({ error: 'Referral code is required' });
        return;
      }

      if (role === 'RIDER') {
        await this.referralService.applyReferralCode(userId, referralCode);
        res.json({
          message: 'Referral code applied successfully. Complete your first delivery to earn ₦1,000!'
        });
        return;
      }

      await this.referralService.applyCustomerReferral(userId, referralCode);
      res.json({
        message: 'Referral applied successfully. You get 20% off your first 3 delivery fees!'
      });
    } catch (error: any) {
      if (error.message.includes('Invalid') || error.message.includes('Cannot') || error.message.includes('already') || error.message.includes('discount')) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Failed to apply referral code' });
    }
  };

  updateReferralCode = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const role = req.user!.role;
      const { referral_code, code } = req.body;
      const referralCode = referral_code || code;

      if (!referralCode) {
        res.status(400).json({ error: 'Referral code is required' });
        return;
      }

      if (role === 'RIDER') {
        await this.referralService.updateReferralCode(userId, referralCode);
      } else {
        await this.referralService.updateCustomerReferralCode(userId, referralCode);
      }

      res.json({
        message: 'Referral code updated successfully',
        referral_code: referralCode.toUpperCase()
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
      const userId = req.user!.userId;
      const role = req.user!.role;

      const stats = role === 'RIDER'
        ? await this.referralService.getReferralStats(userId)
        : await this.referralService.getCustomerReferralStats(userId);

      res.json({
        message: 'Referral stats retrieved',
        data: stats
      });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to get referral stats' });
    }
  };
}
