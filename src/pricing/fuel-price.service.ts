import { SystemConfigModel } from './system-config.model.js';

const FUEL_PRICE_KEY = 'fuel_price';
const DEFAULT_FUEL_PRICE = 1100; // ₦1,100/L baseline

export class FuelPriceService {
  async setFuelPrice(pricePerLiter: number): Promise<void> {
    await SystemConfigModel.upsert({ key: FUEL_PRICE_KEY, value: pricePerLiter.toString() });
  }

  async getFuelPrice(): Promise<number> {
    const record = await SystemConfigModel.findOne({ where: { key: FUEL_PRICE_KEY } });
    return record ? parseFloat(record.value) : DEFAULT_FUEL_PRICE;
  }
}

export const fuelPriceService = new FuelPriceService();
