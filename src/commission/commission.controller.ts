import { Request, Response } from 'express';
import { CommissionService } from './commission.service.js';

export class CommissionController {
  private commissionService: CommissionService;

  constructor() {
    this.commissionService = new CommissionService();
  }

  createCommission = async (req: Request, res: Response) => {
    try {
      const { package_id, driver_id, delivery_fee } = req.body;
      const commission = await this.commissionService.calculateCommission(package_id, driver_id, delivery_fee);
      res.status(201).json(commission);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create commission' });
    }
  };

  getDriverEarnings = async (req: Request, res: Response) => {
    try {
      const { driver_id } = req.params;
      const earnings = await this.commissionService.getRiderEarnings(driver_id);
      res.json(earnings);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get driver earnings' });
    }
  };

  payCommission = async (req: Request, res: Response) => {
    try {
      const { commission_id } = req.params;
      const commission = await this.commissionService.payCommission(commission_id);
      res.json(commission);
    } catch (error) {
      res.status(500).json({ error: 'Failed to pay commission' });
    }
  };

  getEarningsSummary = async (req: Request, res: Response) => {
    try {
      const { driver_id } = req.params;
      const { days } = req.query;
      const summary = await this.commissionService.getEarningsSummary(driver_id, Number(days) || 30);
      res.json(summary);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get earnings summary' });
    }
  };
}