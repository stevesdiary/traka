import { ReferralModel } from './referral.model.js';
import { Transaction } from 'sequelize';

export class ReferralRepository {
  async createReferral(data: {
    referrer_rider_id: string;
    referred_rider_id: string;
    referral_code: string;
  }): Promise<ReferralModel> {
    return await ReferralModel.create(data);
  }

  async findByReferralCode(code: string): Promise<ReferralModel | null> {
    return await ReferralModel.findOne({ where: { referral_code: code } });
  }

  async findByReferredRider(riderId: string): Promise<ReferralModel | null> {
    return await ReferralModel.findOne({ where: { referred_rider_id: riderId } });
  }

  async findPendingByReferredRider(riderId: string): Promise<ReferralModel | null> {
    return await ReferralModel.findOne({
      where: {
        referred_rider_id: riderId,
        status: 'PENDING'
      }
    });
  }

  async updateStatus(id: string, status: string, t?: Transaction): Promise<void> {
    await ReferralModel.update(
      { status },
      { where: { id }, transaction: t }
    );
  }

  async markCompleted(id: string, t?: Transaction): Promise<void> {
    await ReferralModel.update(
      {
        status: 'COMPLETED',
        first_delivery_at: new Date()
      },
      { where: { id }, transaction: t }
    );
  }

  async markRewarded(id: string, t?: Transaction): Promise<void> {
    await ReferralModel.update(
      {
        status: 'REWARDED',
        rewarded_at: new Date()
      },
      { where: { id }, transaction: t }
    );
  }

  async getReferralsByReferrer(referrerId: string): Promise<ReferralModel[]> {
    return await ReferralModel.findAll({
      where: { referrer_rider_id: referrerId },
      order: [['created_at', 'DESC']]
    });
  }
}
