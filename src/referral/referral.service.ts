import { sequelize } from '../config/database.js';
import { ReferralRepository } from './referral.repository.js';
import { CustomerReferralRepository } from './customer-referral.repository.js';
import { WalletRepository } from '../wallet/wallet.repository.js';
import { RiderRepository } from '../rider/rider.repository.js';
import { UserRepository } from '../user/user.repository.js';
import { UserModel } from '../user/user.model.js';
import { ReferralModel } from './referral.model.js';
import { CustomerReferralModel } from './customer-referral.model.js';

export class ReferralService {
  private referralRepository = new ReferralRepository();
  private customerReferralRepository = new CustomerReferralRepository();
  private walletRepository = new WalletRepository();
  private riderRepository = new RiderRepository();
  private userRepository = new UserRepository();
  private readonly REFERRAL_REWARD = 1000.00;
  private readonly CUSTOMER_DISCOUNT_PERCENT = 20;
  private readonly CUSTOMER_DISCOUNT_MAX_ORDERS = 3;

  async getActiveReferralDiscount(userId: string): Promise<CustomerReferralModel | null> {
    const referral = await this.customerReferralRepository.findByReferredUser(userId);
    if (!referral) return null;

    const maxOrders = Number(referral.discount_max_orders ?? 0);
    const used = Number(referral.discount_orders_used ?? 0);
    if (maxOrders <= 0 || used >= maxOrders) return null;

    return referral;
  }

  async recordDiscountedOrder(referral: CustomerReferralModel): Promise<void> {
    const maxOrders = Number(referral.discount_max_orders ?? 0);
    const used = Number(referral.discount_orders_used ?? 0);

    await this.customerReferralRepository.incrementDiscountUsage(referral.id);

    if (used + 1 >= maxOrders) {
      await this.customerReferralRepository.markCompleted(referral.id);
    }
  }

  async getCustomerReferralCode(userId: string): Promise<string> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.referral_code) {
      return user.referral_code;
    }

    return await this.generateCustomerReferralCode(user);
  }

  private async generateCustomerReferralCode(user: UserModel): Promise<string> {
    const baseName = (user.first_name || 'TRAKA').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6) || 'TRAKA';
    let code = '';
    let attempts = 0;
    const maxAttempts = 100;

    while (attempts < maxAttempts) {
      const randomDigits = Math.floor(Math.random() * 100).toString().padStart(2, '0');
      code = `${baseName}${randomDigits}`;

      const existing = await this.userRepository.findByReferralCode(code);
      if (!existing) {
        await this.userRepository.updateReferralCode(user.id, code);
        return code;
      }
      attempts++;
    }

    throw new Error('Unable to generate unique referral code');
  }

  async updateCustomerReferralCode(userId: string, newCode: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.referral_code_updated_at) {
      const daysSinceUpdate = Math.floor(
        (Date.now() - new Date(user.referral_code_updated_at).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceUpdate < 14) {
        const daysRemaining = 14 - daysSinceUpdate;
        throw new Error(`You can update your referral code again in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}`);
      }
    }

    const normalized = newCode.toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (normalized.length < 3 || normalized.length > 20) {
      throw new Error('Referral code must be 3-20 characters');
    }

    const existing = await this.userRepository.findByReferralCode(normalized);
    if (existing && existing.id !== userId) {
      throw new Error('Referral code already taken');
    }

    await this.userRepository.updateReferralCode(userId, normalized);
  }

  async applyCustomerReferral(referredUserId: string, referralCode: string): Promise<void> {
    const normalized = referralCode.toUpperCase().trim();

    const referrer = await this.userRepository.findByReferralCode(normalized);
    if (!referrer) {
      throw new Error('Invalid referral code');
    }

    if (referrer.id === referredUserId) {
      throw new Error('Cannot refer yourself');
    }

    const existingReferral = await this.customerReferralRepository.findByReferredUser(referredUserId);
    if (existingReferral) {
      throw new Error('You already have a referral discount applied');
    }

    await this.customerReferralRepository.create({
      referral_code: normalized,
      referrer_user_id: referrer.id,
      referred_user_id: referredUserId,
      discount_percent: this.CUSTOMER_DISCOUNT_PERCENT,
      discount_max_orders: this.CUSTOMER_DISCOUNT_MAX_ORDERS,
      discount_orders_used: 0
    });
  }

  async getCustomerReferralStats(userId: string): Promise<any> {
    const referrals = await this.customerReferralRepository.getByReferrer(userId);
    const referralCode = await this.getCustomerReferralCode(userId);
    const myDiscount = await this.customerReferralRepository.findByReferredUser(userId);

    const discountOrdersRemaining = myDiscount
      ? Math.max(0, Number(myDiscount.discount_max_orders ?? 0) - Number(myDiscount.discount_orders_used ?? 0))
      : null;

    return {
      total_referrals: referrals.length,
      successful_referrals: referrals.filter(r => r.status === 'COMPLETED' || r.status === 'REWARDED').length,
      total_bonus_earned: 0,
      referral_code: referralCode,
      discount_percent: myDiscount?.discount_percent ?? null,
      discount_orders_remaining: discountOrdersRemaining,
      referrals: referrals.map(r => ({
        referred_user_id: r.referred_user_id,
        status: r.status,
        created_at: r.createdAt,
        completed_at: r.completed_at
      }))
    };
  }

  async generateReferralCode(riderId: string, firstName: string): Promise<string> {
    const baseName = firstName.toUpperCase().replace(/[^A-Z]/g, '');
    let code = '';
    let attempts = 0;
    const maxAttempts = 100;

    while (attempts < maxAttempts) {
      const randomDigits = Math.floor(Math.random() * 100).toString().padStart(2, '0');
      code = `${baseName}${randomDigits}`;

      const existing = await this.riderRepository.findByReferralCode(code);
      if (!existing) {
        await this.riderRepository.updateReferralCode(riderId, code);
        return code;
      }
      attempts++;
    }

    throw new Error('Unable to generate unique referral code');
  }

  async getRiderReferralCode(riderId: string): Promise<string> {
    const rider = await this.riderRepository.getRiderByUserId(riderId);
    if (!rider) {
      throw new Error('Rider not found');
    }

    if (rider.referral_code) {
      return rider.referral_code;
    }

    const firstName = rider.user.first_name;
    return await this.generateReferralCode(riderId, firstName);
  }

  async updateReferralCode(riderId: string, newCode: string): Promise<void> {
    const rider = await this.riderRepository.getRiderByUserId(riderId);
    if (!rider) {
      throw new Error('Rider not found');
    }

    // Check if code was updated in the last 14 days
    if (rider.referral_code_updated_at) {
      const daysSinceUpdate = Math.floor(
        (Date.now() - new Date(rider.referral_code_updated_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceUpdate < 14) {
        const daysRemaining = 14 - daysSinceUpdate;
        throw new Error(`You can update your referral code again in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}`);
      }
    }

    const normalized = newCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    if (normalized.length < 3 || normalized.length > 20) {
      throw new Error('Referral code must be 3-20 characters');
    }

    const existing = await this.riderRepository.findByReferralCode(normalized);
    if (existing && existing.user_id !== riderId) {
      throw new Error('Referral code already taken');
    }

    await this.riderRepository.updateReferralCode(riderId, normalized);
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
      if (!referral.referrer_rider_id) {
        throw new Error('Referral has no referrer');
      }
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
    const referralCode = await this.getRiderReferralCode(riderId);
    
    return {
      total_referrals: referrals.length,
      successful_referrals: referrals.filter(r => r.status === 'COMPLETED' || r.status === 'REWARDED').length,
      total_bonus_earned: referrals.filter(r => r.status === 'REWARDED').length * this.REFERRAL_REWARD,
      pending: referrals.filter(r => r.status === 'PENDING').length,
      completed: referrals.filter(r => r.status === 'COMPLETED').length,
      rewarded: referrals.filter(r => r.status === 'REWARDED').length,
      total_earned: referrals.filter(r => r.status === 'REWARDED').length * this.REFERRAL_REWARD,
      referral_code: referralCode,
      referrals: referrals.map(r => ({
        referred_rider_id: r.referred_rider_id,
        status: r.status,
        created_at: r.createdAt,
        first_delivery_at: r.first_delivery_at,
        rewarded_at: r.rewarded_at
      }))
    };
  }
}
