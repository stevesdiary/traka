import { Model, ModelCtor } from 'sequelize-typescript';
import { WhereOptions } from 'sequelize';

export abstract class BaseRepository<T extends Model> {
  protected model: ModelCtor<T>;

  constructor(model: ModelCtor<T>) {
    this.model = model;
  }

  async findByTenant(tenant_id: string, options?: any): Promise<T[]> {
    return this.model.findAll({
      where: { tenant_id, ...options?.where } as WhereOptions,
      ...options
    });
  }

  async findOneByTenant(tenant_id: string, options?: any): Promise<T | null> {
    return this.model.findOne({
      where: { tenant_id, ...options?.where } as WhereOptions,
      ...options
    });
  }

  async createWithTenant(data: any, tenant_id: string): Promise<T> {
    return this.model.create({ ...data, tenant_id });
  }

  async updateByTenant(id: string, tenant_id: string, data: any): Promise<[number, T[]]> {
    return this.model.update(data, {
      where: { id, tenant_id } as WhereOptions,
      returning: true
    });
  }

  async deleteByTenant(id: string, tenant_id: string): Promise<number> {
    return this.model.destroy({
      where: { id, tenant_id } as WhereOptions
    });
  }

  async findAll(options?: any): Promise<T[]> {
    return this.model.findAll(options);
  }

  async findById(id: string): Promise<T | null> {
    return this.model.findByPk(id);
  }

  async deleteById(id: string): Promise<number> {
    return this.model.destroy({
      where: { id } as WhereOptions
    });
  }

  async updateById(id: string, data: any): Promise<[number, T[]]> {
    return this.model.update(data, {
      where: { id } as WhereOptions,
      returning: true
    });
  }
}