import { sequelize } from '../config/database.js';
import { ReferralRepository } from './referral.repository.js';
import { WalletRepository } from '../wallet/wallet.repository.js';
import { RiderRepository } from '../rider/rider.repository.js';

export class ReferralService {
  private referralRepository = new ReferralRepository();
  private walletRepository = new WalletRepository();
  private riderRepository = new RiderRepository();
  private readonly REFERRAL_REWARD = 1000.00;

  generateReferralCode(riderId: string): string {
    return `REF${riderId.substring(0, 8).toUpperCase()}`;
  }

  async getRiderReferralCode(riderId: string): Promise<string> {
    return this.generateReferralCode(riderId);
  }

  async applyReferralCode(referredRiderId: string, referralCode: string): Promise<void> {
    const referrer = await this.riderRepository.findByReferralCode(referralCode);
    if (!referrer) {
      throw new Error('Invalid referral code');
    }

    if (referrer.user_id === referredRiderId) {
      throw new Error('Cannot refer yourself');
    }

    const existingReferral = await this.referralRepository.findByReferredRider(referredRiderId);
    if (existingReferral) {
      throw new Error('Rider already has a referrer');
    }

    await this.referralRepository.createReferral({
      referrer_rider_id: referrer.user_id,
      referred_rider_id: referredRiderId,
      referral_code: referralCode
    });
  }

  async processReferralReward(referredRiderId: string): Promise<void> {
    const referral = await this.referralRepository.findPendingByReferredRider(referredRiderId);
    
    if (!referral) return;

    const t = await sequelize.transaction();

    try {
      // Get wallets
      const referrerWallet = await this.walletRepository.findByUserId(referral.referrer_rider_id);
      const referredWallet = await this.walletRepository.findByUserId(referredRiderId);

      if (!referrerWallet || !referredWallet) {
        throw new Error('Wallet not found');
      }

      // Credit referrer
      await this.walletRepository.updateBalance(referrerWallet.id, this.REFERRAL_REWARD, t);
      await this.walletRepository.createTransaction({
        wallet_id: referrerWallet.id,
        amount: this.REFERRAL_REWARD,
        type: 'REFERRAL_BONUS',
        reference: `REF-${referral.id}`,
        description: `Referral bonus for rider ${referredRiderId.substring(0, 8)}`
      }, t);

      // Credit referred rider
      await this.walletRepository.updateBalance(referredWallet.id, this.REFERRAL_REWARD, t);
      await this.walletRepository.createTransaction({
        wallet_id: referredWallet.id,
        amount: this.REFERRAL_REWARD,
        type: 'REFERRAL_BONUS',
        reference: `REF-${referral.id}`,
        description: 'Welcome referral bonus'
      }, t);

      // Mark referral as completed and rewarded
      await this.referralRepository.markCompleted(referral.id, t);
      await this.referralRepository.markRewarded(referral.id, t);

      await t.commit();
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  async getReferralStats(riderId: string): Promise<any> {
    const referrals = await this.referralRepository.getReferralsByReferrer(riderId);
    
    return {
      total_referrals: referrals.length,
      pending: referrals.filter(r => r.status === 'PENDING').length,
      completed: referrals.filter(r => r.status === 'COMPLETED').length,
      rewarded: referrals.filter(r => r.status === 'REWARDED').length,
      total_earned: referrals.filter(r => r.status === 'REWARDED').length * this.REFERRAL_REWARD,
      referral_code: this.generateReferralCode(riderId),
      referrals: referrals.map(r => ({
        referred_rider_id: r.referred_rider_id,
        status: r.status,
        created_at: r.created_at,
        first_delivery_at: r.first_delivery_at,
        rewarded_at: r.rewarded_at
      }))
    };
  }
}
