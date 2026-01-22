import { Request, Response } from 'express';
import { pricingService } from './pricing.service.js';

export class PricingController {
  async calculatePrice(req: Request, res: Response): Promise<void> {
    try {
      const { pickup_address, delivery_address, package_size, package_weight, delivery_speed } = req.body;
      const tenant_id = req.user?.tenant_id || null;

      const pricing = await pricingService.calculateDeliveryPrice({
        pickup_address,
        delivery_address,
        package_size,
        package_weight,
        delivery_speed,
        tenant_id
      });

      res.json({
        success: true,
        data: pricing
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to calculate pricing',
        message: error.message
      });
    }
  }
}

export const pricingController = new PricingController();
