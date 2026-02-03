import { BaseRepository } from '../repositories/base.repository.js';
import { RiderModel, RiderProfile } from './rider.model.js';
import { WhereOptions } from 'sequelize';

export class RiderRepository extends BaseRepository<RiderModel> {
  constructor() {
    super(RiderModel);
  }

  async createRiderProfile(profile: Omit<RiderProfile, 'id' | 'rider_id' | 'created_at' | 'updated_at'>): Promise<RiderModel> {
    const riderId = await this.generateUniqueRiderId();
    return this.model.create({ ...profile, rider_id: riderId });
  }

  private async generateUniqueRiderId(): Promise<string> {
    const lastRider = await this.model.findOne({
      order: [['created_at', 'DESC']],
      attributes: ['rider_id']
    });

    let nextNumber = 1000;
    if (lastRider?.rider_id) {
      const match = lastRider.rider_id.match(/TRK-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    return `TRK-${String(nextNumber).padStart(4, '0')}`;
  }

  async getRiderByUserId(userId: string): Promise<RiderModel | null> {
    return this.model.findOne({
      where: { user_id: userId },
      include: ['user']
    });
  }

  async updateRiderProfile(userId: string, updates: Partial<RiderProfile>): Promise<RiderModel> {
    await this.model.update(updates, { where: { user_id: userId } });
    return this.getRiderByUserId(userId) as Promise<RiderModel>;
  }

  async updateVerificationStatus(userId: string, status: RiderProfile['verification_status']): Promise<RiderModel> {
    await this.model.update({ verification_status: status }, { where: { user_id: userId } });
    return this.getRiderByUserId(userId) as Promise<RiderModel>;
  }

  async getBusinessRiders(businessId: string): Promise<RiderModel[]> {
    return this.model.findAll({
      where: { business_id: businessId },
      include: ['user'],
      order: [['createdAt', 'DESC']]
    });
  }

  async getPendingVerifications(businessId?: string): Promise<RiderModel[]> {
    const where: WhereOptions = { verification_status: 'PENDING' };
    if (businessId) {
      where.business_id = businessId;
    }
    
    return this.model.findAll({
      where,
      include: ['user'],
      order: [['createdAt', 'ASC']]
    });
  }

  async getAvailableRiders(businessId?: string): Promise<RiderModel[]> {
    const where: WhereOptions = { 
      verification_status: 'VERIFIED',
      status: 'AVAILABLE',
      is_available: true
    };
    if (businessId) {
      where.business_id = businessId;
    }
    
    return this.model.findAll({
      where,
      include: ['user']
    });
  }

  async updateLocation(userId: string, latitude: number, longitude: number): Promise<RiderModel> {
    await this.model.update(
      { current_latitude: latitude, current_longitude: longitude },
      { where: { user_id: userId } }
    );
    return this.getRiderByUserId(userId) as Promise<RiderModel>;
  }

  async updateStatus(userId: string, status: RiderProfile['status']): Promise<RiderModel> {
    await this.model.update({ status }, { where: { user_id: userId } });
    return this.getRiderByUserId(userId) as Promise<RiderModel>;
  }

  async updateAvailability(userId: string, is_available: boolean): Promise<RiderModel> {
    const status: RiderProfile['status'] = is_available ? 'AVAILABLE' : 'OFFLINE';
    await this.model.update({ is_available, status }, { where: { user_id: userId } });
    return this.getRiderByUserId(userId) as Promise<RiderModel>;
  }

  async getUniqueTenants(): Promise<any[]> {
    return this.model.findAll({
      attributes: ['business_id'],
      where: { business_id: { [require('sequelize').Op.ne]: null } },
      group: ['business_id']
    });
  }

  async findByReferralCode(referralCode: string): Promise<RiderModel | null> {
    return this.model.findOne({
      where: { referral_code: referralCode }
    });
  }

  async updateReferralCode(userId: string, referralCode: string): Promise<void> {
    await this.model.update(
      { 
        referral_code: referralCode,
        referral_code_updated_at: new Date()
      },
      { where: { user_id: userId } }
    );
  }

  async softDeleteRider(riderId: string): Promise<void> {
    await this.model.destroy({ where: { id: riderId } });
  }

  async hardDeleteRider(riderId: string): Promise<void> {
    await this.model.destroy({ where: { id: riderId }, force: true });
  }

  async restoreRider(riderId: string): Promise<RiderModel | null> {
    await this.model.restore({ where: { id: riderId } });
    return this.model.findByPk(riderId, { paranoid: false });
  }

  async getDeletedRiders(businessId?: string): Promise<RiderModel[]> {
    const where: WhereOptions = {};
    if (businessId) {
      where.business_id = businessId;
    }
    return this.model.findAll({
      where,
      paranoid: false,
      include: ['user']
    }).then(riders => riders.filter(r => r.deletedAt !== null));
  }

  async hasActiveDeliveries(riderId: string): Promise<boolean> {
    const { PackageModel } = await import('../package/package.model.js');
    const rider = await this.model.findByPk(riderId);
    if (!rider) return false;
    
    const count = await PackageModel.count({
      where: {
        // Assuming packages will have rider_user_id field
        status: ['PENDING', 'IN_TRANSIT', 'OUT_FOR_DELIVERY']
      }
    });
    return count > 0;
  }

  async getRiderWalletBalance(userId: string): Promise<number> {
    const { WalletModel } = await import('../wallet/wallet.model.js');
    const wallet = await WalletModel.findOne({ where: { user_id: userId } });
    return wallet ? Number(wallet.balance) : 0;
  }

  async findByRiderId(riderId: string): Promise<RiderModel | null> {
    return this.model.findOne({
      where: { rider_id: riderId },
      include: ['user']
    });
  }

  async findByIdWithUser(riderId: string): Promise<RiderModel | null> {
    return this.model.findByPk(riderId, { include: ['user'] });
  }

  async findByIdIncludingDeleted(riderId: string): Promise<RiderModel | null> {
    return this.model.findByPk(riderId, { paranoid: false });
  }
}
