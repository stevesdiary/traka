import { BaseRepository } from '../repositories/base.repository.js';
import { PackageModel } from './package.model.js';

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
    tenant_id: string;
  }): Promise<PackageModel> {
    return this.model.create(packageData as any);
  }

  async updateStatus(id: string, tenant_id: string, updateData: any): Promise<[number, PackageModel[]]> {
    return this.updateByTenant(id, tenant_id, updateData);
  }

  async updatePackage(id: string, updateData: {
    recipient_id?: string;
    guest_tracking_token?: string | null;
    pickup_pin?: string;
    delivery_pin?: string;
    qr_code_data?: string;
  }): Promise<[number, PackageModel[]]> {
    return this.model.update(updateData, {
      where: { id },
      returning: true
    });
  }
}