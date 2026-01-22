import { redis } from '../config/database.js';

const FUEL_PRICE_KEY = 'traka:fuel_price';
const FUEL_PRICE_TTL = 86400; // 24 hours
const DEFAULT_FUEL_PRICE = 1100; // ₦1,100/L baseline

export class FuelPriceService {
  async setFuelPrice(pricePerLiter: number): Promise<void> {
    await redis.setEx(FUEL_PRICE_KEY, FUEL_PRICE_TTL, pricePerLiter.toString());
  }

  async getFuelPrice(): Promise<number> {
    const price = await redis.get(FUEL_PRICE_KEY);
    return price ? parseFloat(price) : DEFAULT_FUEL_PRICE;
  }
}

export const fuelPriceService = new FuelPriceService();
