import { Request, Response } from 'express';
import { fuelPriceService } from './fuel-price.service.js';

export class FuelPriceController {
  async updateFuelPrice(req: Request, res: Response): Promise<void> {
    const { price_per_liter } = req.body;

    await fuelPriceService.setFuelPrice(price_per_liter);

    res.json({
      success: true,
      message: 'Fuel price updated successfully',
      data: { price_per_liter }
    });
  }

  async getFuelPrice(req: Request, res: Response): Promise<void> {
    const price = await fuelPriceService.getFuelPrice();

    res.json({
      success: true,
      data: { price_per_liter: price }
    });
  }
}

export const fuelPriceController = new FuelPriceController();
