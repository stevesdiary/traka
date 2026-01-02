import { CommissionRepository } from './commission.repository.js';
import { CommissionModel, Commission, CommissionSummary } from './commission.model.js';
import { RiderModel } from '../rider/rider.model.js';

export class CommissionService {
  private commissionRepository: CommissionRepository;

  constructor() {
    this.commissionRepository = new CommissionRepository();
  }

  async calculateCommission(packageId: string, riderId: string, deliveryFee: number): Promise<CommissionModel> {
    const commissionRate = 0.15; // 15% commission rate
    const commissionAmount = deliveryFee * commissionRate;

    return await this.commissionRepository.createCommission({
      driver_id: riderId, // keeping field name for backward compatibility
      package_id: packageId,
      delivery_fee: deliveryFee,
      commission_rate: commissionRate,
      commission_amount: commissionAmount,
      status: 'PENDING'
    });
  }

  async getRiderEarnings(riderId: string): Promise<CommissionModel[]> {
    return await this.commissionRepository.getDriverCommissions(riderId);
  }

  async payCommission(commissionId: string): Promise<CommissionModel> {
    return await this.commissionRepository.updateCommissionStatus(commissionId, 'PAID');
  }

  async getEarningsSummary(riderId: string, days: number = 30): Promise<CommissionSummary> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    return await this.commissionRepository.getCommissionSummary(riderId, startDate, endDate);
  }
}