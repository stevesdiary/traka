import { BaseRepository } from '../repositories/base.repository.js';
import { PackageModel } from './package.model.js';
import { Op } from 'sequelize';

export class PackageRepository extends BaseRepository<PackageModel> {
  constructor() {
    super(PackageModel);
  }

  async findByTrackingNumber(tracking_number: string): Promise<PackageModel | null> {
    return this.model.findOne({ 
      where: { tracking_number },
      include: ['sender', 'recipient']
    });
  }

  async createPackage(packageData: {
    tracking_number: string;
    sender_id: string;
    recipient_id?: string | null;
    recipient_name: string;
    recipient_email?: string;
    recipient_phone: string;
    pickup_address: string;
    delivery_address: string;
    description: string;
    delivery_notes?: string;
    package_size: string;
    package_weight?: number;
    delivery_speed: string;
    delivery_fee?: number;
    platform_fee?: number;
    total_amount?: number;
    estimated_distance_km?: number;
    guest_tracking_token?: string | null;
    tenant_id: string | null;
  }): Promise<PackageModel> {
    return this.model.create(packageData as any);
  }

  async updateStatus(id: string, tenant_id: string | null, updateData: any): Promise<[number, PackageModel[]]> {
    if (tenant_id) {
      return this.updateByTenant(id, tenant_id, updateData);
    }
    return this.model.update(updateData, {
      where: { id },
      returning: true
    });
  }

  async findByUserId(userId: string): Promise<PackageModel[]> {
    return this.model.findAll({
      where: {
        [Op.or]: [
          { sender_id: userId },
          { recipient_id: userId }
        ]
      },
      include: ['sender', 'recipient'],
      order: [['createdAt', 'DESC']]
    });
  }

  async findAvailablePackages(): Promise<PackageModel[]> {
    return this.model.findAll({
      where: {
        status: 'PENDING',
        rider_id: null,
        pickup_address: { [Op.ne]: null },
        [Op.or]: [
          { payment_status: 'PAID' },
          { payment_method: { [Op.in]: ['CASH', 'BANK_TRANSFER'] } },
        ],
      },
      order: [['createdAt', 'DESC']]
    });
  }

  async findByRiderId(riderId: string): Promise<PackageModel[]> {
    return this.model.findAll({
      where: { rider_id: riderId }
    });
  }

  async findActiveByRiderId(riderId: string): Promise<PackageModel[]> {
    return this.model.findAll({
      where: {
        rider_id: riderId,
        status: { [Op.in]: ['PENDING', 'OUT_FOR_DELIVERY', 'IN_TRANSIT'] },
      },
      order: [['createdAt', 'DESC']],
    });
  }

  async assignRider(packageId: string, riderUserId: string, etaSeconds?: number): Promise<void> {
    const updateData: any = { rider_id: riderUserId };
    if (etaSeconds !== undefined) {
      updateData.eta_seconds = etaSeconds;
      updateData.estimated_arrival_at = new Date(Date.now() + etaSeconds * 1000);
    }
    await this.model.update(updateData, {
      where: { id: packageId }
    });
  }

  async updatePackage(id: string, updateData: {
    recipient_id?: string;
    guest_tracking_token?: string | null;
    pickup_pin?: string;
    delivery_pin?: string;
    qr_code_data?: string;
    status?: string;
    cancellation_reason?: string;
    cancellation_note?: string;
    cancelled_at?: Date;
    cancelled_by?: string;
    rider_has_package?: boolean;
    rider_id?: string;
    recipient_name?: string;
    recipient_email?: string | null;
    recipient_phone?: string;
    delivery_address?: string;
    delivery_fee?: number;
    platform_fee?: number;
    total_amount?: number;
    estimated_distance_km?: number;
    eta_seconds?: number | null;
    estimated_arrival_at?: Date | null;
  }): Promise<[number, PackageModel[]]> {
    return this.model.update(updateData, {
      where: { id },
      returning: true
    });
  }
}
