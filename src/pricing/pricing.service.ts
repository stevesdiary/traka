import { fuelPriceService } from './fuel-price.service.js';
import { GeocodingService } from '../utils/geocoding.service.js';
import config from '../config/environment.js';
import logger from '../utils/logger.js';

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
  weight_multiplier: number;
  platform_fee: number;
  total_amount: number;
  estimated_distance_km: number;
}

const PRICING_CONFIG = {
  BASE_FEE: 500,
  FUEL_BASELINE: 1100,
  DISTANCE_RATE_PER_KM: 100,
  MAX_PACKAGE_WEIGHT_KG: 40,
  DEFAULT_WEIGHT_KG: {
    SMALL: 1,
    MEDIUM: 5,
    LARGE: 12
  },
  WEIGHT_TIERS: [
    { maxWeightKg: 5, multiplier: 1.0 },
    { maxWeightKg: 15, multiplier: 1.25 },
    { maxWeightKg: 40, multiplier: 1.5 }
  ],
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
      logger.warn('Geocoding failed, using Lagos default coordinates', { address });
      return PricingService.LAGOS_DEFAULT;
    }
  }

  async calculateDeliveryPrice(request: PricingRequest): Promise<PricingResponse> {
    if (
      request.package_weight &&
      request.package_weight > PRICING_CONFIG.MAX_PACKAGE_WEIGHT_KG
    ) {
      throw new Error(
        `BULK_DELIVERIES_COMING_SOON: Packages over ${PRICING_CONFIG.MAX_PACKAGE_WEIGHT_KG}kg are coming soon`
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

    const resolvedWeight = this.resolvePackageWeight(request);
    const weight_multiplier = this.resolveWeightMultiplier(resolvedWeight);

    // Weight multiplier compensates the rider for heavy/bulky packages.
    const subtotal =
      (base_fee + distance_fee + speed_fee + fuel_adjustment) * weight_multiplier;
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
      weight_multiplier,
      platform_fee,
      total_amount: Math.round(total_amount),
      estimated_distance_km: Math.round(distance * 10) / 10
    };
  }

  // Use the provided weight, otherwise fall back to a default per size class.
  private resolvePackageWeight(request: PricingRequest): number {
    if (request.package_weight && request.package_weight > 0) {
      return request.package_weight;
    }
    return PRICING_CONFIG.DEFAULT_WEIGHT_KG[request.package_size];
  }

  private resolveWeightMultiplier(weightKg: number): number {
    for (const tier of PRICING_CONFIG.WEIGHT_TIERS) {
      if (weightKg <= tier.maxWeightKg) {
        return tier.multiplier;
      }
    }
    const lastTier =
      PRICING_CONFIG.WEIGHT_TIERS[PRICING_CONFIG.WEIGHT_TIERS.length - 1];
    return lastTier.multiplier;
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
