import { CommissionRepository } from './commission.repository.js';
import { CommissionModel, Commission, CommissionSummary } from './commission.model.js';
import { RiderModel } from '../rider/rider.model.js';
import { ReferralService } from '../referral/referral.service.js';
import config from '../config/environment.js';
import logger from '../utils/logger.js';

export class CommissionService {
  private commissionRepository: CommissionRepository;
  private referralService: ReferralService;

  constructor() {
    this.commissionRepository = new CommissionRepository();
    this.referralService = new ReferralService();
  }

  async calculateCommission(packageId: string, riderId: string, deliveryFee: number): Promise<CommissionModel> {
    const commissionRate = config.financial.riderCommissionRate;
    const commissionAmount = deliveryFee * commissionRate;

    const commission = await this.commissionRepository.createCommission({
      driver_id: riderId, // keeping field name for backward compatibility
      package_id: packageId,
      delivery_fee: deliveryFee,
      commission_rate: commissionRate,
      commission_amount: commissionAmount,
      status: 'PENDING'
    });

    // Process referral reward if this is the rider's first delivery
    try {
      await this.referralService.processReferralReward(riderId);
    } catch (error) {
      logger.error('Referral reward processing failed', { riderId, error: error instanceof Error ? error.message : String(error) });
    }

    return commission;
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