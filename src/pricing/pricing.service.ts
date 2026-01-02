export interface PricingRequest {
  pickup_address: string;
  delivery_address: string;
  package_size: 'SMALL' | 'MEDIUM' | 'LARGE';
  package_weight?: number;
  delivery_speed: 'STANDARD' | 'EXPRESS' | 'SAME_DAY';
  tenant_id: string;
}

export interface BulkPricingRequest {
  pickup_address: string;
  deliveries: {
    delivery_address: string;
    package_size: 'SMALL' | 'MEDIUM' | 'LARGE';
    package_weight?: number;
  }[];
  delivery_speed: 'STANDARD' | 'EXPRESS' | 'SAME_DAY';
  tenant_id: string;
}

export interface PricingResult {
  base_fee: number;
  distance_fee: number;
  size_fee: number;
  speed_fee: number;
  platform_fee: number;
  total_amount: number;
  estimated_distance_km: number;
}

export interface BulkPricingResult {
  deliveries: (PricingResult & { delivery_address: string })[];
  bulk_discount: number;
  total_amount: number;
  total_deliveries: number;
}

export class PricingService {
  private readonly BASE_RATES = {
    STANDARD: 5.00,
    EXPRESS: 8.00,
    SAME_DAY: 12.00
  };

  private readonly DISTANCE_RATE_PER_KM = 1.50;
  private readonly PLATFORM_FEE_RATE = 0.15; // 15%

  private readonly SIZE_MULTIPLIERS = {
    SMALL: 1.0,
    MEDIUM: 1.3,
    LARGE: 1.6
  };

  private readonly BULK_DISCOUNT_RATES = {
    2: 0.05,  // 5% discount for 2+ deliveries
    5: 0.10,  // 10% discount for 5+ deliveries
    10: 0.15  // 15% discount for 10+ deliveries
  };

  async calculateBulkDeliveryPrice(request: BulkPricingRequest): Promise<BulkPricingResult> {
    const deliveryPrices = await Promise.all(
      request.deliveries.map(async (delivery) => {
        const singleRequest: PricingRequest = {
          pickup_address: request.pickup_address,
          delivery_address: delivery.delivery_address,
          package_size: delivery.package_size,
          package_weight: delivery.package_weight,
          delivery_speed: request.delivery_speed,
          tenant_id: request.tenant_id
        };
        
        const pricing = await this.calculateDeliveryPrice(singleRequest);
        return {
          ...pricing,
          delivery_address: delivery.delivery_address
        };
      })
    );

    const subtotal = deliveryPrices.reduce((sum, price) => sum + price.total_amount, 0);
    const bulk_discount = this.calculateBulkDiscount(request.deliveries.length, subtotal);
    const total_amount = subtotal - bulk_discount;

    return {
      deliveries: deliveryPrices,
      bulk_discount,
      total_amount: Math.round(total_amount * 100) / 100,
      total_deliveries: request.deliveries.length
    };
  }

  private calculateBulkDiscount(deliveryCount: number, subtotal: number): number {
    let discountRate = 0;
    
    if (deliveryCount >= 10) discountRate = this.BULK_DISCOUNT_RATES[10];
    else if (deliveryCount >= 5) discountRate = this.BULK_DISCOUNT_RATES[5];
    else if (deliveryCount >= 2) discountRate = this.BULK_DISCOUNT_RATES[2];
    
    return Math.round(subtotal * discountRate * 100) / 100;
  }

  async calculateDeliveryPrice(request: PricingRequest): Promise<PricingResult> {
    const distance = await this.calculateDistance(request.pickup_address, request.delivery_address);
    
    const base_fee = this.BASE_RATES[request.delivery_speed];
    const distance_fee = distance * this.DISTANCE_RATE_PER_KM;
    const size_fee = base_fee * (this.SIZE_MULTIPLIERS[request.package_size] - 1);
    const speed_fee = request.delivery_speed === 'SAME_DAY' ? 5.00 : 0;
    
    const subtotal = base_fee + distance_fee + size_fee + speed_fee;
    const platform_fee = subtotal * this.PLATFORM_FEE_RATE;
    const total_amount = subtotal + platform_fee;

    return {
      base_fee,
      distance_fee,
      size_fee,
      speed_fee,
      platform_fee,
      total_amount: Math.round(total_amount * 100) / 100,
      estimated_distance_km: distance
    };
  }

  private async calculateDistance(pickup: string, delivery: string): Promise<number> {
    // TODO: Integrate with Google Maps Distance Matrix API or similar
    // For now, return mock distance based on address similarity
    const mockDistance = Math.random() * 20 + 2; // 2-22 km
    return Math.round(mockDistance * 100) / 100;
  }

  async getTenantPricingRules(tenant_id: string): Promise<any> {
    // TODO: Implement tenant-specific pricing rules
    return {
      discount_rate: 0,
      bulk_discount_threshold: 10,
      bulk_discount_rate: 0.1
    };
  }
}