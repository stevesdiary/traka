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
  size_fee: number;
  speed_fee: number;
  platform_fee: number;
  total_amount: number;
  estimated_distance_km: number;
}

export class PricingService {
  async calculateDeliveryPrice(request: PricingRequest): Promise<PricingResponse> {
    // Placeholder implementation - will be replaced with actual pricing logic
    return {
      base_fee: 500,
      distance_fee: 300,
      size_fee: 200,
      speed_fee: 100,
      platform_fee: 150,
      total_amount: 1250,
      estimated_distance_km: 5
    };
  }
}

export const pricingService = new PricingService();
