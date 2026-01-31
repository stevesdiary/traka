import { PromotionRepository } from './promotion.repository.js';
import { PromotionModel } from './promotion.model.js';

export class PromotionService {
  private repository = new PromotionRepository();

  async createPromotion(data: {
    code: string;
    name: string;
    description?: string;
    discount_type: 'PERCENTAGE' | 'FIXED';
    discount_value: number;
    max_uses?: number;
    max_uses_per_user?: number;
    start_date: Date | string;
    end_date: Date | string;
    is_active?: boolean;
    created_by?: string;
  }): Promise<PromotionModel> {
    const code = data.code.trim().toUpperCase();
    const existing = await this.repository.findByCode(code);
    if (existing) {
      throw new Error('Promotion code already exists');
    }

    const start = new Date(data.start_date);
    const end = new Date(data.end_date);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new Error('Invalid start or end date');
    }
    if (end <= start) {
      throw new Error('End date must be after start date');
    }
    if (data.discount_type === 'PERCENTAGE' && data.discount_value > 100) {
      throw new Error('Percentage discount cannot exceed 100');
    }

    return this.repository.createPromotion({
      ...data,
      code,
      start_date: start,
      end_date: end
    });
  }

  async listPromotions(filters: {
    status?: 'active' | 'inactive' | 'scheduled' | 'expired';
  }) {
    return this.repository.listPromotions(filters);
  }

  async getPromotionById(id: string): Promise<PromotionModel | null> {
    return this.repository.findById(id);
  }

  async updatePromotion(id: string, updates: Partial<PromotionModel>): Promise<PromotionModel> {
    if (updates.code) {
      const code = updates.code.trim().toUpperCase();
      const existing = await this.repository.findByCode(code);
      if (existing && existing.id !== id) {
        throw new Error('Promotion code already exists');
      }
      updates.code = code;
    }

    if (updates.discount_type || updates.discount_value) {
      const current = await this.repository.findById(id);
      if (!current) {
        throw new Error('Promotion not found');
      }
      const discountType = (updates.discount_type || current.discount_type) as string;
      const discountValue = Number(
        updates.discount_value !== undefined ? updates.discount_value : current.discount_value
      );
      if (discountType === 'PERCENTAGE' && discountValue > 100) {
        throw new Error('Percentage discount cannot exceed 100');
      }
    }

    if (updates.start_date || updates.end_date) {
      const current = await this.repository.findById(id);
      if (!current) {
        throw new Error('Promotion not found');
      }
      const start = updates.start_date ? new Date(updates.start_date as any) : new Date(current.start_date);
      const end = updates.end_date ? new Date(updates.end_date as any) : new Date(current.end_date);
      if (end <= start) {
        throw new Error('End date must be after start date');
      }
      updates.start_date = start;
      updates.end_date = end;
    }

    const updated = await this.repository.updatePromotion(id, updates);
    if (!updated) {
      throw new Error('Promotion not found');
    }
    return updated;
  }

  async getPromotionStats(id: string) {
    const totalUses = await this.repository.countUsage(id);
    const uniqueUsers = await this.repository.countUniqueUsers(id);
    return {
      total_uses: totalUses,
      unique_users: uniqueUsers
    };
  }

  async listPromotionUsages(id: string, page = 1, limit = 50) {
    return this.repository.listUsages(id, page, limit);
  }

  async redeemPromotion(params: {
    code: string;
    user_id: string;
    amount?: number;
    currency?: string;
    package_id?: string;
  }) {
    const promotion = await this.getActivePromotion(params.code);

    const totalUses = await this.repository.countUsage(promotion.id);
    if (promotion.max_uses !== null && promotion.max_uses !== undefined && totalUses >= promotion.max_uses) {
      throw new Error('Promotion usage limit reached');
    }

    const userUses = await this.repository.countUsageByUser(promotion.id, params.user_id);
    if (
      promotion.max_uses_per_user !== null &&
      promotion.max_uses_per_user !== undefined &&
      userUses >= promotion.max_uses_per_user
    ) {
      throw new Error('User has reached promotion usage limit');
    }

    const discountAmount = params.amount !== undefined
      ? this.calculateDiscount(Number(params.amount), promotion)
      : undefined;

    const usage = await this.repository.createUsage({
      promotion_id: promotion.id,
      user_id: params.user_id,
      package_id: params.package_id,
      discount_amount: discountAmount,
      currency: params.currency || 'NGN',
      used_at: new Date()
    });

    return {
      promotion: {
        id: promotion.id,
        code: promotion.code,
        name: promotion.name,
        discount_type: promotion.discount_type,
        discount_value: Number(promotion.discount_value)
      },
      discount_amount: discountAmount,
      usage_id: usage.id
    };
  }

  private async getActivePromotion(code: string): Promise<PromotionModel> {
    const promo = await this.repository.findByCode(code.trim().toUpperCase());
    if (!promo) {
      throw new Error('Promotion not found');
    }

    const now = new Date();
    if (!promo.is_active) {
      throw new Error('Promotion is not active');
    }
    if (now < new Date(promo.start_date) || now > new Date(promo.end_date)) {
      throw new Error('Promotion is not currently valid');
    }

    return promo;
  }

  private calculateDiscount(amount: number, promotion: PromotionModel): number {
    if (!Number.isFinite(amount) || amount <= 0) return 0;

    if (promotion.discount_type === 'PERCENTAGE') {
      const percent = Number(promotion.discount_value);
      const raw = amount * (percent / 100);
      return Math.round(Math.min(raw, amount) * 100) / 100;
    }

    const fixed = Number(promotion.discount_value);
    return Math.round(Math.min(fixed, amount) * 100) / 100;
  }
}

export const promotionService = new PromotionService();
