import { BaseRepository } from '../repositories/base.repository';
import { CommissionModel, Commission, CommissionSummary } from './commission.model';
import { RiderModel } from '../rider/rider.model';
import { Op } from 'sequelize';

export class CommissionRepository extends BaseRepository<CommissionModel> {
  constructor() {
    super(CommissionModel);
  }

  async createCommission(commission: Omit<Commission, 'id' | 'created_at'>): Promise<CommissionModel> {
    return this.model.create(commission);
  }

  async getDriverCommissions(riderId: string): Promise<CommissionModel[]> {
    return this.model.findAll({
      where: { driver_id: riderId }, // keeping field name for backward compatibility
      order: [['createdAt', 'DESC']]
    });
  }

  async updateCommissionStatus(id: string, status: Commission['status']): Promise<CommissionModel> {
    const updateData: any = { status };
    if (status === 'PAID') {
      updateData.paid_at = new Date();
    }
    
    await this.model.update(updateData, { where: { id } });
    return this.model.findByPk(id) as Promise<CommissionModel>;
  }

  async getCommissionSummary(riderId: string, startDate: Date, endDate: Date): Promise<CommissionSummary> {
    const result = await this.model.findAll({
      where: {
        driver_id: riderId, // keeping field name for backward compatibility
        createdAt: {
          [Op.between]: [startDate, endDate]
        }
      },
      attributes: [
        'driver_id',
        [this.model.sequelize!.fn('COUNT', '*'), 'total_deliveries'],
        [this.model.sequelize!.fn('SUM', this.model.sequelize!.col('commission_amount')), 'total_earnings'],
        [this.model.sequelize!.fn('SUM', 
          this.model.sequelize!.literal("CASE WHEN status = 'PENDING' THEN commission_amount ELSE 0 END")
        ), 'pending_amount'],
        [this.model.sequelize!.fn('SUM', 
          this.model.sequelize!.literal("CASE WHEN status = 'PAID' THEN commission_amount ELSE 0 END")
        ), 'paid_amount']
      ],
      group: ['driver_id'],
      raw: true
    });

    const summary = result[0] as any;
    return {
      driver_id: summary.driver_id,
      total_deliveries: parseInt(summary.total_deliveries),
      total_earnings: parseFloat(summary.total_earnings || 0),
      pending_amount: parseFloat(summary.pending_amount || 0),
      paid_amount: parseFloat(summary.paid_amount || 0),
      period_start: startDate,
      period_end: endDate
    };
  }
}