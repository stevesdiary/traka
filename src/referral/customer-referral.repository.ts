import { CustomerReferralModel } from './customer-referral.model.js';

export class CustomerReferralRepository {
  async create(data: {
    referrer_user_id: string;
    referred_user_id: string;
    referral_code: string;
    discount_percent: number;
    discount_max_orders: number;
    discount_orders_used?: number;
  }): Promise<CustomerReferralModel> {
    return await CustomerReferralModel.create(data);
  }

  async findByReferredUser(userId: string): Promise<CustomerReferralModel | null> {
    return await CustomerReferralModel.findOne({ where: { referred_user_id: userId } });
  }

  async getByReferrer(referrerId: string): Promise<CustomerReferralModel[]> {
    return await CustomerReferralModel.findAll({
      where: { referrer_user_id: referrerId },
      order: [['createdAt', 'DESC']]
    });
  }

  async incrementDiscountUsage(id: string): Promise<void> {
    await CustomerReferralModel.increment('discount_orders_used', { where: { id } });
  }

  async markCompleted(id: string): Promise<void> {
    await CustomerReferralModel.update(
      {
        status: 'COMPLETED',
        completed_at: new Date()
      },
      { where: { id } }
    );
  }

  async findById(id: string): Promise<CustomerReferralModel | null> {
    return await CustomerReferralModel.findByPk(id);
  }
}
