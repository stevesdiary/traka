import { Request, Response } from 'express';
import { promotionService } from './promotion.service.js';
import config from '../config/environment.js';

export class PromotionController {
  createPromotion = async (req: Request, res: Response): Promise<void> => {
    try {
      const createdBy = req.user?.userId;
      const promotion = await promotionService.createPromotion({
        ...req.body,
        created_by: createdBy
      });

      res.status(201).json({
        message: 'Promotion created successfully',
        promotion
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to create promotion' });
    }
  };

  listPromotions = async (req: Request, res: Response): Promise<void> => {
    try {
      const status = req.query.status as any;
      const promotions = await promotionService.listPromotions({ status });
      res.json({ promotions, count: promotions.length });
    } catch (error: any) {
      res.status(500).json({ error: config.isDevelopment ? error.message : 'Failed to fetch promotions' });
    }
  };

  getPromotionById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params as Record<string, string>;
      const promotion = await promotionService.getPromotionById(id);
      if (!promotion) {
        res.status(404).json({ error: 'Promotion not found' });
        return;
      }

      const stats = await promotionService.getPromotionStats(id);
      res.json({ promotion, stats });
    } catch (error: any) {
      res.status(500).json({ error: config.isDevelopment ? error.message : 'Failed to fetch promotion' });
    }
  };

  updatePromotion = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params as Record<string, string>;
      const promotion = await promotionService.updatePromotion(id, req.body);
      res.json({ message: 'Promotion updated successfully', promotion });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to update promotion' });
    }
  };

  getPromotionUsages = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params as Record<string, string>;
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 50;
      const promotion = await promotionService.getPromotionById(id);
      if (!promotion) {
        res.status(404).json({ error: 'Promotion not found' });
        return;
      }

      const result = await promotionService.listPromotionUsages(id, page, limit);
      res.json({ promotion_id: id, ...result });
    } catch (error: any) {
      res.status(500).json({ error: config.isDevelopment ? error.message : 'Failed to fetch promotion usages' });
    }
  };

  redeemPromotion = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const result = await promotionService.redeemPromotion({
        code: req.body.code,
        user_id: userId,
        amount: req.body.amount,
        currency: req.body.currency,
        package_id: req.body.package_id
      });

      res.json({ message: 'Promotion redeemed successfully', ...result });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to redeem promotion' });
    }
  };
}

export const promotionController = new PromotionController();
