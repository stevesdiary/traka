import { BaseRepository } from '../repositories/base.repository';
import { RiderModel, RiderProfile } from './rider.model';
import { WhereOptions } from 'sequelize';

export class RiderRepository extends BaseRepository<RiderModel> {
  constructor() {
    super(RiderModel);
  }

  async createRiderProfile(profile: Omit<RiderProfile, 'id' | 'created_at' | 'updated_at'>): Promise<RiderModel> {
    return this.model.create(profile);
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
}