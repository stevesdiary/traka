import { fuelPriceService } from './fuel-price.service.js';
import { GeocodingService } from '../utils/geocoding.service.js';
import config from '../config/environment.js';

export interface PricingRequest {
  pickup_address: string;
  delivery_address: string;
  package_size: 'SMALL' | 'MEDIUM' | 'LARGE';
  package_weight?: number;
  delivery_speed: 'STANDARD' | 'EXPRESS' | 'SAME_DAY';
  tenant_id: string | null;
}

export interface PricingResponse {
  base_fee: number;
  distance_fee: number;
  speed_fee: number;
  fuel_adjustment: number;
  platform_fee: number;
  total_amount: number;
  estimated_distance_km: number;
}

const PRICING_CONFIG = {
  BASE_FEE: 500,
  FUEL_BASELINE: 1100,
  DISTANCE_RATE_PER_KM: 100,
  MAX_PACKAGE_WEIGHT_KG: 40,
  SPEED_FEES: {
    STANDARD: 0,
    EXPRESS: 300,
    SAME_DAY: 150
  }
};

export class PricingService {
  private geocodingService: GeocodingService;

  constructor() {
    this.geocodingService = new GeocodingService();
  }

  // Default Lagos coordinates used as fallback when geocoding fails
  private static readonly LAGOS_DEFAULT = { latitude: 6.5244, longitude: 3.3792 };

  private async safeGeocode(address: string): Promise<{ latitude: number; longitude: number }> {
    try {
      return await this.geocodingService.geocodeAddress(address);
    } catch {
      console.warn(`Geocoding failed for "${address}", using Lagos default coordinates`);
      return PricingService.LAGOS_DEFAULT;
    }
  }

  async calculateDeliveryPrice(request: PricingRequest): Promise<PricingResponse> {
    if (
      request.package_weight &&
      request.package_weight > PRICING_CONFIG.MAX_PACKAGE_WEIGHT_KG
    ) {
      throw new Error(
        `PACKAGE_HEAVIER_THAN_CAPACITY: Package weight exceeds the ${PRICING_CONFIG.MAX_PACKAGE_WEIGHT_KG}kg limit`
      );
    }

    const pickupGeo = await this.safeGeocode(request.pickup_address);
    const deliveryGeo = await this.safeGeocode(request.delivery_address);

    const distance = this.calculateDistance(
      pickupGeo.latitude,
      pickupGeo.longitude,
      deliveryGeo.latitude,
      deliveryGeo.longitude
    );

    const base_fee = PRICING_CONFIG.BASE_FEE;
    const distance_fee = distance * PRICING_CONFIG.DISTANCE_RATE_PER_KM;
    const speed_fee = PRICING_CONFIG.SPEED_FEES[request.delivery_speed];

    const currentFuelPrice = await fuelPriceService.getFuelPrice();
    const fuel_adjustment = this.calculateFuelAdjustment(currentFuelPrice, distance);

    const subtotal = base_fee + distance_fee + speed_fee + fuel_adjustment;
    // Individual riders/users pay the rider commission rate (20%); business
    // tenants use their own platform fee rate.
    const platformFeeRate = request.tenant_id
      ? config.financial.platformFeeRateBusiness
      : config.financial.riderCommissionRate;
    const platform_fee = subtotal * platformFeeRate;
    const total_amount = subtotal + platform_fee;

    return {
      base_fee,
      distance_fee,
      speed_fee,
      fuel_adjustment,
      platform_fee,
      total_amount: Math.round(total_amount),
      estimated_distance_km: Math.round(distance * 10) / 10
    };
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private calculateFuelAdjustment(currentPrice: number, distance: number): number {
    if (currentPrice <= PRICING_CONFIG.FUEL_BASELINE) {
      return 0;
    }
    const priceIncrease = currentPrice - PRICING_CONFIG.FUEL_BASELINE;
    const percentageIncrease = priceIncrease / PRICING_CONFIG.FUEL_BASELINE;
    return Math.round(distance * PRICING_CONFIG.DISTANCE_RATE_PER_KM * percentageIncrease);
  }
}

export const pricingService = new PricingService();
