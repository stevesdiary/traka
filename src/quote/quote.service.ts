import { QuoteModel } from './quote.model.js';
import { pricingService } from '../pricing/pricing.service.js';
import { nanoid } from 'nanoid';

interface CreateQuoteRequest {
  pickup_address: string;
  delivery_address: string;
  package_size: 'SMALL' | 'MEDIUM' | 'LARGE';
  package_weight?: number;
  delivery_speed: 'STANDARD' | 'EXPRESS' | 'SAME_DAY';
  contact_email?: string;
  anonymous_session_id?: string;
  user_id?: string;
}

interface QuoteResponse {
  quote_code: string;
  estimated_price: number;
  currency: string;
  delivery_eta: string;
  expires_at: string;
  estimated_distance_km?: number;
  breakdown: {
    base_fee: number;
    distance_fee: number;
    size_fee: number;
    speed_fee: number;
    fuel_adjustment: number;
    platform_fee: number;
  };
}

export class QuoteService {
  async createQuote(request: CreateQuoteRequest): Promise<QuoteResponse> {
    // Use existing pricing service
    const pricing = await pricingService.calculateDeliveryPrice({
      pickup_address: request.pickup_address,
      delivery_address: request.delivery_address,
      package_size: request.package_size,
      package_weight: request.package_weight,
      delivery_speed: request.delivery_speed,
      tenant_id: null
    });

    // Generate unique quote code
    const quote_code = `TRK-${nanoid(5).toUpperCase()}`;

    // Set expiration (24 hours from now)
    const expires_at = new Date();
    expires_at.setHours(expires_at.getHours() + 24);

    // Save quote to database
    const quote = await QuoteModel.create({
      quote_code,
      pickup_address: request.pickup_address,
      delivery_address: request.delivery_address,
      package_size: request.package_size,
      package_weight: request.package_weight,
      delivery_speed: request.delivery_speed,
      estimated_price: pricing.total_amount,
      currency: 'NGN',
      estimated_distance_km: pricing.estimated_distance_km,
      expires_at,
      created_by_user_id: request.user_id || null,
      anonymous_session_id: request.anonymous_session_id || null,
      contact_email: request.contact_email || null,
      status: 'ACTIVE'
    });

    // Calculate delivery ETA based on speed
    const delivery_eta = this.calculateDeliveryEta(request.delivery_speed);

    return {
      quote_code: quote.quote_code,
      estimated_price: pricing.total_amount,
      currency: 'NGN',
      delivery_eta,
      expires_at: quote.expires_at.toISOString(),
      estimated_distance_km: pricing.estimated_distance_km,
      breakdown: {
        base_fee: pricing.base_fee,
        distance_fee: pricing.distance_fee,
        size_fee: pricing.size_fee,
        speed_fee: pricing.speed_fee,
        fuel_adjustment: pricing.fuel_adjustment,
        platform_fee: pricing.platform_fee
      }
    };
  }

  async getQuoteByCode(quote_code: string): Promise<QuoteModel | null> {
    return await QuoteModel.findOne({
      where: { quote_code }
    });
  }

  async getUserQuotes(user_id: string, limit: number = 10): Promise<QuoteModel[]> {
    return await QuoteModel.findAll({
      where: { created_by_user_id: user_id },
      order: [['created_at', 'DESC']],
      limit
    });
  }

  async getAnonymousQuotes(session_id: string, limit: number = 10): Promise<QuoteModel[]> {
    return await QuoteModel.findAll({
      where: { anonymous_session_id: session_id },
      order: [['created_at', 'DESC']],
      limit
    });
  }

  async markAsConverted(quote_code: string, package_id: string): Promise<void> {
    await QuoteModel.update(
      {
        status: 'CONVERTED',
        converted_to_package_id: package_id
      },
      {
        where: { quote_code }
      }
    );
  }

  async expireOldQuotes(): Promise<number> {
    const { Op } = await import('sequelize');
    const [affectedCount] = await QuoteModel.update(
      { status: 'EXPIRED' },
      {
        where: {
          status: 'ACTIVE',
          expires_at: {
            [Op.lt]: new Date()
          }
        }
      }
    );
    return affectedCount;
  }

  private calculateDeliveryEta(delivery_speed: string): string {
    switch (delivery_speed) {
      case 'SAME_DAY':
        return 'Same day';
      case 'EXPRESS':
        return '2-4 hours';
      case 'STANDARD':
      default:
        return '1-2 days';
    }
  }
}

export const quoteService = new QuoteService();
