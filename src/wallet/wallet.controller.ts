import { Request, Response } from 'express';
import { WalletService } from './wallet.service.js';

export class WalletController {
  private walletService = new WalletService();

  getBalance = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const balance = await this.walletService.getWalletBalance(userId);
      const wallet = await this.walletService.getWallet(userId);

      res.json({
        balance,
        is_active: wallet?.is_active ?? true,
        credit_limit: wallet?.credit_limit ?? -2000
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  getTransactions = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const transactions = await this.walletService.getTransactionHistory(userId, limit);

      res.json({ transactions });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  payForDelivery = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { package_id } = req.body;
      if (!package_id) {
        res.status(400).json({ error: 'package_id is required' });
        return;
      }

      const result = await this.walletService.payForDelivery(userId, package_id);
      res.json(result);
    } catch (error: any) {
      const status = error.message.includes('Insufficient') ? 402 : 400;
      res.status(status).json({ error: error.message });
    }
  };

  processCashDelivery = async (req: Request, res: Response): Promise<void> => {
    try {
      const { riderId, totalFare, packageId } = req.body;

      if (!riderId || !totalFare || !packageId) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      await this.walletService.processCashDelivery(riderId, totalFare, packageId);

      res.json({ message: 'Cash delivery processed successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };
}