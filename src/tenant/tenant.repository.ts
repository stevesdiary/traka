import { BaseRepository } from '../repositories/base.repository';
import { TenantModel, Tenant } from './tenant.model';

export class TenantRepository extends BaseRepository<TenantModel> {
  constructor() {
    super(TenantModel);
  }

  async createTenant(tenantData: Omit<Tenant, 'id' | 'created_at' | 'updated_at'>): Promise<TenantModel> {
    return this.model.create(tenantData);
  }

  async findById(id: string): Promise<TenantModel | null> {
    return this.model.findByPk(id);
  }

  async updateStatus(id: string, status: Tenant['status']): Promise<TenantModel> {
    await this.model.update({ status }, { where: { id } });
    return this.findById(id) as Promise<TenantModel>;
  }

  async getAllTenants(): Promise<TenantModel[]> {
    return this.model.findAll({
      order: [['createdAt', 'DESC']]
    });
  }
}