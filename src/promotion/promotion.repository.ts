import { Op } from 'sequelize';
import { PromotionModel, PromotionUsageModel } from './promotion.model.js';

export class PromotionRepository {
  async findByCode(code: string): Promise<PromotionModel | null> {
    return PromotionModel.findOne({ where: { code } });
  }

  async findById(id: string): Promise<PromotionModel | null> {
    return PromotionModel.findByPk(id);
  }

  async createPromotion(data: Partial<PromotionModel>): Promise<PromotionModel> {
    return PromotionModel.create(data as any);
  }

  async updatePromotion(id: string, updates: Partial<PromotionModel>): Promise<PromotionModel | null> {
    const [count, rows] = await PromotionModel.update(updates, {
      where: { id },
      returning: true
    });
    return count > 0 ? rows[0] : null;
  }

  async listPromotions(filters: {
    status?: 'active' | 'inactive' | 'scheduled' | 'expired';
  }): Promise<PromotionModel[]> {
    const where: any = {};
    const now = new Date();

    if (filters.status === 'active') {
      where.is_active = true;
      where.start_date = { [Op.lte]: now };
      where.end_date = { [Op.gte]: now };
    } else if (filters.status === 'inactive') {
      where.is_active = false;
    } else if (filters.status === 'scheduled') {
      where.start_date = { [Op.gt]: now };
    } else if (filters.status === 'expired') {
      where.end_date = { [Op.lt]: now };
    }

    return PromotionModel.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });
  }

  async countUsage(promotionId: string): Promise<number> {
    return PromotionUsageModel.count({ where: { promotion_id: promotionId } });
  }

  async countUsageByUser(promotionId: string, userId: string): Promise<number> {
    return PromotionUsageModel.count({
      where: { promotion_id: promotionId, user_id: userId }
    });
  }

  async countUniqueUsers(promotionId: string): Promise<number> {
    return PromotionUsageModel.count({
      where: { promotion_id: promotionId },
      distinct: true,
      col: 'user_id'
    });
  }

  async createUsage(data: Partial<PromotionUsageModel>): Promise<PromotionUsageModel> {
    return PromotionUsageModel.create(data as any);
  }

  async listUsages(promotionId: string, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const { rows, count } = await PromotionUsageModel.findAndCountAll({
      where: { promotion_id: promotionId },
      order: [['used_at', 'DESC']],
      limit,
      offset
    });

    return {
      usages: rows,
      total: count,
      page,
      totalPages: Math.ceil(count / limit)
    };
  }
}
