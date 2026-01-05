import { LegalContentModel } from './legal.model.js';

export class LegalRepository {
  async findByType(type: string): Promise<LegalContentModel[]> {
    return await LegalContentModel.findAll({
      where: { 
        type,
        is_active: true 
      },
      order: [['category', 'ASC'], ['order_index', 'ASC']]
    });
  }

  async findLatestByType(type: string): Promise<LegalContentModel | null> {
    return await LegalContentModel.findOne({
      where: { 
        type,
        is_active: true 
      },
      order: [['content_version', 'DESC']]
    });
  }

  async count(): Promise<number> {
    return await LegalContentModel.count();
  }

  async bulkCreate(data: any[]): Promise<LegalContentModel[]> {
    return await LegalContentModel.bulkCreate(data);
  }
}