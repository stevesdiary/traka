import { Request, Response } from 'express';
import { cashPaymentService } from './cash-payment.service.js';
import logger from '../utils/logger.js';

export class CashPaymentController {
  confirmCashPayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { package_id } = req.params;
      const { amount_collected } = req.body;
      const rider_id = req.user!.userId;

      if (!amount_collected || amount_collected <= 0) {
        res.status(400).json({ error: 'Valid amount_collected is required' });
        return;
      }

      const result = await cashPaymentService.confirmCashPayment(
        package_id,
        rider_id,
        amount_collected
      );

      logger.info('Cash payment confirmed via API', {
        package_id,
        rider_id,
        amount: amount_collected
      });

      res.json(result);
    } catch (error: any) {
      logger.error('Failed to confirm cash payment', {
        error: error.message,
        package_id: req.params.package_id,
        rider_id: req.user?.userId
      });
      res.status(500).json({ error: error.message || 'Failed to confirm cash payment' });
    }
  };

  getCashPaymentSummary = async (req: Request, res: Response): Promise<void> => {
    try {
      const rider_id = req.user!.userId;

      const summary = await cashPaymentService.getCashPaymentSummary(rider_id);

      res.json(summary);
    } catch (error: any) {
      logger.error('Failed to get cash payment summary', {
        error: error.message,
        rider_id: req.user?.userId
      });
      res.status(500).json({ error: 'Failed to get cash payment summary' });
    }
  };
}
